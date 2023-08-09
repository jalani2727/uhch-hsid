'use strict';

/**
 * @namespace Login
 */

var server = require('server');
var Site = require('dw/system/Site');
server.extend(module.superModule);

var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var StringUtils = require('dw/util/StringUtils');
var Calendar = require('dw/util/Calendar');

/**
 * Login-OAuthLogin : This endpoint invokes the External OAuth Providers Login
 * @name Base/Login-OAuthLogin
 * @function
 * @memberof Login
 * @param {middleware} - server.middleware.https
 * @param {middleware} - consentTracking.consent
 * @param {querystringparameter} - oauthProvider - ID of the OAuth Provider. e.g. Facebook, Google
 * @param {querystringparameter} - oauthLoginTargetEndPoint - Valid values for this parameter are 1 or 2. These values are mapped in oAuthRenentryRedirectEndpoints.js
 * @param {category} - sensitive
 * @param {renders} - isml if there is an error
 * @param {serverfunction} - get
 */
server.replace('OAuthLogin', server.middleware.https, consentTracking.consent, function (req, res, next) {
    var oauthLoginFlowMgr = require('dw/customer/oauth/OAuthLoginFlowMgr');
    var Resource = require('dw/web/Resource');
    var endpoints = require('*/cartridge/config/oAuthRenentryRedirectEndpoints');

    var targetEndPoint = req.querystring.oauthLoginTargetEndPoint ?
        parseInt(req.querystring.oauthLoginTargetEndPoint, 10) :
        null;
    var pid = req.querystring.pid;
    if (targetEndPoint && targetEndPoint === 8 && endpoints[targetEndPoint] && pid && pid !== null) {
        req.session.privacyCache.set(
            'oauthLoginTargetEndPoint',
            endpoints[targetEndPoint] + '?pid=' + pid
        );
    } else if (targetEndPoint && endpoints[targetEndPoint]) {
        req.session.privacyCache.set(
            'oauthLoginTargetEndPoint',
            endpoints[targetEndPoint]
        );
    } else {
        res.render('/error', {
            message: Resource.msg('error.oauth.login.failure', 'login', null)
        });

        return next();
    }

    var preferences = require('*/cartridge/config/preferences.js');
    var oauthProvider = preferences.oauthProvider;

    var result = oauthLoginFlowMgr.initiateOAuthLogin(oauthProvider);
    if (result) {
        if (oauthProvider === 'HSID') {
            var resultUrl = result.location.split('redirect_uri');
            var resultUrl1 = resultUrl[0] + 'pfidpadapterid=' + preferences.hsId_pfidpadapterid;
            var resultUrl2 = resultUrl[1] + '&portal=' + preferences.hsId_portal;
            var redirectUrl = resultUrl1 + '&response_type=code&scope=openid+profile&redirect_uri' + resultUrl2;
            res.redirect(redirectUrl);
        } else {
            res.redirect(result.location);
        }
    } else {
        res.render('/error', {
            message: Resource.msg('error.oauth.login.failure', 'login', null)
        });
        return next();
    }

    return next();
});
/**
 * Login-OAuthReentry : This endpoint is called by the External OAuth Login Provider (Facebook, Google etc. to re-enter storefront after shopper logs in using their service
 * @name Base/Login-OAuthReentry
 * @function
 * @memberof Login
 * @param {middleware} - server.middleware.https
 * @param {middleware} - consentTracking.consent
 * @param {querystringparameter} - code - given by facebook
 * @param {querystringparameter} - state - given by facebook
 * @param {category} - sensitive
 * @param {renders} - isml only if there is a error
 * @param {serverfunction} - get
 */
server.replace('OAuthReentry', server.middleware.https, consentTracking.consent, function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var Logger = require('dw/system/Logger');
    var oauthLoginFlowMgr = require('dw/customer/oauth/OAuthLoginFlowMgr');
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var Transaction = require('dw/system/Transaction');
    var Resource = require('dw/web/Resource');
    var newCustomer;

    var consentTrackingValue = req.session.privacyCache.get('consent');
    try {
        var destination = req.session.privacyCache.store.oauthLoginTargetEndPoint;

        var finalizeOAuthLoginResult = oauthLoginFlowMgr.finalizeOAuthLogin();
        if (!finalizeOAuthLoginResult) {
            res.redirect(URLUtils.url('Login-Show'));
            return next();
        }
        if (!finalizeOAuthLoginResult.accessTokenResponse || !finalizeOAuthLoginResult.accessTokenResponse.accessToken) {
            var redirectURL = URLUtils.https('Login-OAuthLogin', 'oauthLoginTargetEndPoint', 7);
            res.redirect(redirectURL);
            return next();
        }
        var response = finalizeOAuthLoginResult.userInfoResponse.userInfo;
        var oauthProviderID = finalizeOAuthLoginResult.accessTokenResponse.oauthProviderId;

        if (!oauthProviderID) {
            res.render('/error', {
                message: Resource.msg('error.oauth.login.failure', 'login', null)
            });

            return next();
        }

        if (!response) {
            res.render('/error', {
                message: Resource.msg('error.oauth.login.failure', 'login', null)
            });

            return next();
        }

        var externalProfile = JSON.parse(response);
        Logger.debug('Identity response {0}', JSON.stringify(externalProfile));

        if (!externalProfile) {
            res.render('/error', {
                message: Resource.msg('error.oauth.login.failure', 'login', null)
            });
            return next();
        }
        // 1. check for userID and update in externalProfile
        var userID = externalProfile.id || externalProfile.user_id || externalProfile.username;
        if (userID) {
            session.privacy.hsIdUUID = userID;
        } else {
            res.render('/error', {
                message: Resource.msg('error.oauth.login.failure', 'login', null)
            });
            return next();
        }
        // 2.check for email, then call to get email from ESSO using HSID-UUID
        var email;

        if (oauthProviderID === 'HSID') {
            var essoHsid = require('*/cartridge/scripts/services/essoHsid.js');
            var essoResponse = essoHsid.queryMember(externalProfile.username, false);
            var essoResponseObject;
            if (essoResponse.error === 401) {
                essoResponse = essoHsid.queryMember(externalProfile.username, true);
            }
            if (essoResponse.status === 'OK') {
                essoResponseObject = JSON.parse(essoResponse.object.text);
                email = essoResponseObject.Resources.Resource[0].UserPayload.emails[0].value;
            } else {
                essoResponse = essoHsid.queryMember(externalProfile.username, true);
                essoResponseObject = JSON.parse(essoResponse.object.text);
                email = essoResponseObject.Resources.Resource[0].UserPayload.emails[0].value;
            }
        } else {
            var emails = externalProfile.emails || externalProfile.PrimaryEmail;

            if (emails && emails.length) {
                email = externalProfile.emails[0].value;
            }
        }

        var authenticatedCustomerProfile = CustomerMgr.getExternallyAuthenticatedCustomerProfile(
            oauthProviderID,
            userID
        );
        if (authenticatedCustomerProfile) {
            var credentials = authenticatedCustomerProfile.getCredentials();
            if (credentials.isEnabled()) {
                Transaction.wrap(function () {
                    CustomerMgr.loginExternallyAuthenticatedCustomer(oauthProviderID, userID, false);
                });
            } else {
                res.render('/error', {
                    message: Resource.msg('error.oauth.login.failure', 'login', null)
                });

                return next();
            }
        }
        var eligibilityHelper = require('*/cartridge/scripts/helpers/eligibilityHelper');
        var memberDetails = {};
        var responseObj = {};
        var accountFound;
        // call requestResource as 'login' for EASE API - oauthtarget
        if (authenticatedCustomerProfile) {
            session.privacy.hsIdUUID = userID || '';
            memberDetails.email = email;
            memberDetails.requestSource = 'login';
            responseObj = eligibilityHelper.getCustomerDetails(memberDetails);
        } else {
            // Create new profile
            Transaction.wrap(function () {
                // create profile and update user profile info from new ease api response
                newCustomer = CustomerMgr.createExternallyAuthenticatedCustomer(
                    oauthProviderID,
                    userID
                );
                authenticatedCustomerProfile = newCustomer.getProfile();
                authenticatedCustomerProfile.setEmail(email);
                CustomerMgr.loginExternallyAuthenticatedCustomer(oauthProviderID, userID, false);
                // merge legacy orders to registered customers
                var preferences = require('*/cartridge/config/preferences.js');
                if (preferences.enableOrderCustomerUpdate) {
                    var utilHelpers = require('*/cartridge/scripts/helpers/utilHelpers');
                    var ordersLinked = utilHelpers.setOrderCustomer(newCustomer);
                    if (ordersLinked) {
                        Transaction.wrap(function () {
                            authenticatedCustomerProfile.custom.linkedLegacyOrders = true;
                        });
                        Logger.info('orders linked for customer ' + customer.profile.customerNo + ' ' + customer.profile.email);
                    }
                }
            });
            // get member details if exists on ease side
            memberDetails.email = email;
            memberDetails.requestSource = 'preRegistration';
            // source = preRegistration
            responseObj = eligibilityHelper.getCustomerDetails(memberDetails);
        }

        accountFound = session.privacy.memberExists;
        // account not found - redirect to the registration page - Login-Details
        if (!accountFound) {
            res.redirect(URLUtils.url('Login-Details'));
            return next();
        } else if (session.privacy.eligibilityTimeout === 'true') {
            res.redirect(URLUtils.url('Login-Details'));
            return next();
        }
        // account found - set HSID and other benefit info in session privacy
        if (accountFound) {
            session.privacy.hsIdUUID = userID || '';
        }
        if (responseObj && responseObj != null) {
            // updating the customer data received from EASE API
            Transaction.wrap(function () {
                if (responseObj.sfdcContactId && responseObj.sfdcContactId !== null) {
                    authenticatedCustomerProfile.custom.sfdcContactID = responseObj.sfdcContactId;
                }
                authenticatedCustomerProfile.setFirstName(responseObj.firstName);
                authenticatedCustomerProfile.setLastName(responseObj.lastName);
                authenticatedCustomerProfile.setEmail(email);
                authenticatedCustomerProfile.setBirthday(responseObj.dob ? new Date(responseObj.dob) : '');
                authenticatedCustomerProfile.setPhoneHome(responseObj.home_phone ? responseObj.home_phone : '');
            });
            // set benefit information in session from ease api responseObj
            var sessionStorageHelper = require('*/cartridge/scripts/helpers/sessionStorageHelper');
            sessionStorageHelper.setCustomerdetailInSessionLogin(responseObj);
            sessionStorageHelper.setCustomerType(req);
        }
        if (authenticatedCustomerProfile && !authenticatedCustomerProfile.custom.sfdcContactID) {
            var logout = URLUtils.url('Login-Logout').toString() + '/';
            res.redirect(logout);
            return next();
        }
        // code for staging Home-show Redirect issue
        var curSite = Site.getCurrent();
        var isHostURL = curSite.getCustomPreferenceValue('isHostURL');
        if (isHostURL) {
            res.redirect(decodeURIComponent(URLUtils.url(destination)));
        }
        if (destination === 'Home-Show' && !isHostURL) {
            var homeUrl = URLUtils.url('Home-Show').toString() + '/';
            res.redirect(homeUrl);
        } else {
            res.redirect(decodeURIComponent(URLUtils.url(destination)));
        }
    } catch (error) {
        var displayError = error;
        Logger.error('Error while login {0}', JSON.stringify(displayError));
        // handled for the bookmark url
        // try to attempt login for only one time
        var currentSite = Site.getCurrent();
        var isHostUrl = currentSite.getCustomPreferenceValue('isHostURL');
        var url = URLUtils.https('Login-OAuthLogin', 'oauthLoginTargetEndPoint', 7);
        if (req.session.privacyCache.get('loginFailAttempt')) {
            url = URLUtils.https('Home-Show');
        }
        if (!isHostUrl) {
            url = URLUtils.https('Home-Show').toString() + '/';
        }
        req.session.privacyCache.clear();
        req.session.privacyCache.set('consent', consentTrackingValue);
        if (!req.session.privacyCache.get('loginFailAttempt')) {
            req.session.privacyCache.set('loginFailAttempt', true);
        }
        res.redirect(url);
    }
    return next();
});

/**
 * Login-OAuthLogin : This endpoint invokes the External OAuth Providers Login
 * Prepending to add consent tracking to session
 * @name Base/Login-OAuthLogin
 * @function
 * @memberof Login
 * @param {middleware} - server.middleware.https
 * @param {middleware} - consentTracking.consent
 * @param {querystringparameter} - oauthProvider - ID of the OAuth Provider. e.g. Facebook, Google
 * @param {querystringparameter} - oauthLoginTargetEndPoint - Valid values for this parameter are 1 or 2. These values are mapped in oAuthRenentryRedirectEndpoints.js
 * @param {category} - sensitive
 * @param {renders} - isml if there is an error
 * @param {serverfunction} - get
 */
server.prepend('OAuthLogin', server.middleware.https, consentTracking.consent, function (req, res, next) {
    var consent = (req.querystring.target === 'true');
    req.session.raw.setTrackingAllowed(consent);
    req.session.privacyCache.set('consent', consent);
    return next();
});
/**
 * Login-Logout : This endpoint is called to log shopper out of the session
 * @name Base/Login-Logout
 * @function
 * @memberof Login
 * @param {category} - sensitive
 * @param {serverfunction} - get
 * @renders
 */
server.replace('Logout', function (req, res, next) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    CustomerMgr.logoutCustomer(false);
    var preferences = require('*/cartridge/config/preferences.js');

    var logoutURL = preferences.communityLogoutURL;
    // https://www.healthsafe-id.com/content/en/healthsafeid/public/logout.html?HTTP_TARGETPORTAL=xxx&HTTP_TARGETURL=xxxx

    logoutURL = logoutURL.replace('xxx', preferences.hsId_portal);
    var redirectUri = preferences.hsId_portal_redirect_uri;
    // var redirectUri = 'https://staging-na01-epichearing.demandware.net/s/UHCHearing/oauth-reentry';
    logoutURL = logoutURL.replace('xxxx', redirectUri);
    res.redirect(logoutURL);
    next();
});

/**
 * Login-Show : This endpoint is called to load the login page
 * @name Base/Login-Show
 * @function
 * @memberof Login
 * @param {middleware} - consentTracking.consent
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken
 * @param {querystringparameter} - rurl - Redirect URL
 * @param {querystringparameter} - action - Action on submit of Login Form
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.prepend(
    'Show',
    function (req, res, next) {
        var currentSiteID = Site.current.ID;
        var currentSitePipeline = 'Sites-' + currentSiteID + '-Site';
        var preferences = require('*/cartridge/config/preferences.js');
        var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
        if (req.pageMetaData.title === currentSitePipeline) {
            var nameObj = JSON.parse(preferences.pageMetaTitle);
            var title = {};
            title.pageTitle = nameObj['Order-Track'] ? nameObj['Order-Track'].pageTitle : currentSitePipeline;
            pageMetaHelper.setPageMetaData(req.pageMetaData, title);
        }
        return next();
    }, pageMetaData.computedPageMetaData
);

/**
 * Login-Details : This endpoint is called to load the post login details page
 * @name Login-Details
 * @function
 * @memberof Login
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get(
    'Details',
    function (req, res, next) {
        var currentSiteID = Site.current.ID;
        var currentSitePipeline = 'Sites-' + currentSiteID + '-Site';
        var preferences = require('*/cartridge/config/preferences.js');
        var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
        var maxDate = StringUtils.formatCalendar(new Calendar(new Date()), 'yyyy-MM-dd');
        if (req.pageMetaData.title === currentSitePipeline) {
            var nameObj = JSON.parse(preferences.pageMetaTitle);
            var title = {};
            title.pageTitle = nameObj['Login-Details'] ? nameObj['Login-Details'].pageTitle : currentSitePipeline;
            pageMetaHelper.setPageMetaData(req.pageMetaData, title);
        }
        var URLUtils = require('dw/web/URLUtils');
        var actionURL = URLUtils.url('Login-DetailsSubmit').toString();
        res.render('account/createAccountPage', {
            maxDate: maxDate,
            actionURL: actionURL
        });
        next();
    }, pageMetaData.computedPageMetaData
);
/**
 * Login-Details : This endpoint is called to load the post login details page
 * @name Login-Details
 * @function
 * @memberof Login
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.post(
    'DetailsSubmit',
    function (req, res, next) {
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var Transaction = require('dw/system/Transaction');
        var URLUtils = require('dw/web/URLUtils');
        var eligibilityHelper = require('*/cartridge/scripts/helpers/eligibilityHelper');
        var preferences = require('*/cartridge/config/preferences.js');
        var responseObj;
        var email;
        var newCustomer;
        var profile;
        if (req.currentCustomer.profile) {
            email = req.currentCustomer.profile.email;
            newCustomer = CustomerMgr.getCustomerByCustomerNumber(
                req.currentCustomer.profile.customerNo
            );
            profile = newCustomer.getProfile();
        }
        var noInsurance = req.form['no-insurance'] ? req.form['no-insurance'] : '';
        var externalProfile = {};
        externalProfile.family_name = req.form.userLastName;
        externalProfile.given_name = req.form.userFirstName;
        externalProfile.birthdate = session.privacy.profilebirthdate ? session.privacy.profilebirthdate : req.form.userDob;
        externalProfile.zipCode = req.form.userZipCode;
        externalProfile.phoneNumber = req.form.userPhone;
        if (preferences.useAARP) {
            session.privacy.AARPSubscriberId = req.form.memberId || '';
            externalProfile.healthPlanName = req.form.healthPlanName || '';
        }
        if (noInsurance !== 'on') {
            session.privacy.subscriberId = req.form.memberId || '';
            externalProfile.noInsurance = false;
            externalProfile.healthPlanName = req.form.otherHealthPlan ? req.form.otherHealthPlan : req.form.healthPlanName;
        } else {
            externalProfile.noInsurance = true;
            externalProfile.healthPlanName = '';
        }
        externalProfile.subscriberId = req.form.memberId || '';
        // eslint-disable-next-line no-undef, space-infix-ops
        externalProfile.requestSource = 'registration';
        externalProfile.email = email;
        // update first name and lastname in transaction
        responseObj = eligibilityHelper.getCustomerDetails(externalProfile);
        if (responseObj && responseObj !== null) {
            if (profile) {
                Transaction.wrap(function () {
                    profile.setFirstName(responseObj.firstName ? responseObj.firstName : req.form.userFirstName);
                    profile.setLastName(responseObj.lastName ? responseObj.lastName : req.form.userLastName);
                    profile.setPhoneHome(responseObj.home_phone ? responseObj.home_phone : req.form.userPhone);
                    profile.custom.sfdcContactID = responseObj.sfdcContactId ? responseObj.sfdcContactId : '';
                    profile.custom.zipCode = responseObj.ZipCode ? responseObj.ZipCode : '';
                });
            }
        }
        if (session.privacy.pricebook && session.privacy.pricebook !== null) {
            // updating the pricebook if it is avaiable in the session
            eligibilityHelper.updatePriceBook();
        }
        // set benefit information in session from ease api responseObj
        var sessionStorageHelper = require('*/cartridge/scripts/helpers/sessionStorageHelper');
        sessionStorageHelper.setCustomerdetailInSessionLogin(responseObj);
        sessionStorageHelper.setCustomerType(req);
        eligibilityHelper.displayRegistrationModel();
        var curSite = Site.getCurrent();
        var redirect = curSite.getCustomPreferenceValue('isHostURL');
        var url = redirect ? 'https://' + request.httpHost : URLUtils.url('Home-Show') + '/';
        res.json({
            redirectUrl: url
        });
        next();
    }
);

module.exports = server.exports();

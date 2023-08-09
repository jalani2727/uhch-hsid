'use strict';

/**
 * @namespace Account
 */

var server = require('server');
server.extend(module.superModule);
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var Site = require('dw/system/Site');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');

/**
 * Account-Show : The Account-Show endpoint will render the shopper's account page. Once a shopper logs in they will see is a dashboard that displays profile, address, payment and order information.
 * @name Custom/Account-Show
 * @function
 * @memberof Account
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.append('Show', function (req, res, next) {
    var currentSiteID = Site.current.ID;
    var currentSitePipeline = 'Sites-' + currentSiteID + '-Site';
    var preferences = require('*/cartridge/config/preferences.js');
    var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
    if (req.pageMetaData.title === currentSitePipeline) {
        var nameObj = JSON.parse(preferences.pageMetaTitle);
        var title = {};
        title.pageTitle = nameObj['Account-Show'] ? nameObj['Account-Show'].pageTitle : currentSitePipeline;
        pageMetaHelper.setPageMetaData(req.pageMetaData, title);
    }
    var viewData = {};
    var communicationPreference = session.privacy.communicationInstruction && session.privacy.communicationInstruction !== null ? session.privacy.communicationInstruction : '';
    viewData.communicationPreference = communicationPreference;
    res.setViewData(viewData);

    next();
}, pageMetaData.computedPageMetaData);

/**
 * Account-SSO : The Account-SSO endpoint will called from the community on change password,
 * edit profile, login from community.
 * @name Custom/Account-SSO
 * @function
 * @memberof Account
 * @param {serverfunction} - get
 */
server.get('SSO', function (req, res, next) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var URLUtils = require('dw/web/URLUtils');
    var consentTrackingValue = req.session.privacyCache.get('consent');
    if (customer.authenticated) {
        CustomerMgr.logoutCustomer(false);
    }
    req.session.privacyCache.set('consent', consentTrackingValue);
    var url = URLUtils.https('Login-OAuthLogin', 'oauthLoginTargetEndPoint', 1, 'target', consentTrackingValue);
    res.redirect(url);
    next();
});


/**
 * Account-Header : The Account-Header endpoint is used as a remote include to include the login/account menu in the header
 * @name Base/Account-Header
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.include
 * @param {querystringparameter} - mobile - a flag determining whether or not the shopper is on a mobile sized screen this determines what isml template to render
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */

server.append('Header', server.middleware.include, function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var viewData = res.getViewData();
    var oauthLoginTargetEndPoint = parseInt(req.querystring.oAuthId, 10);
    var signInUrl = URLUtils.https('Login-OAuthLogin', 'oauthLoginTargetEndPoint', oauthLoginTargetEndPoint || 1);
    var pid = req.querystring.pid;
    if (pid && (pid.includes('pid'))) {
        var productURLParam = 8 + '&' + pid;
        signInUrl = decodeURIComponent(URLUtils.https('Login-OAuthLogin', 'oauthLoginTargetEndPoint', productURLParam));
    }
    viewData.signInUrl = signInUrl;
    res.setViewData(viewData);
    next();
});

/**
 * Account-EditDetails : The Account-EditDetails endpoint renders the page that allows a shopper to edit their profile. The edit profile form is prefilled with the shopper's first name, last name and email
 * @name Base/Account-EditDetails
 * @function
 * @memberof Account
 * @param {middleware} - userLoggedIn.validateLoggedIn
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get('EditDetails',
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var URLUtils = require('dw/web/URLUtils');
        var currentSiteID = Site.current.ID;
        var currentSitePipeline = 'Sites-' + currentSiteID + '-Site';
        var preferences = require('*/cartridge/config/preferences.js');
        var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
        var userFirstName = '';
        var userLastName = '';
        var email = '';
        var zipCode = '';
        var phone;
        var memberId;
        if (req.pageMetaData.title === currentSitePipeline) {
            var nameObj = JSON.parse(preferences.pageMetaTitle);
            var title = {};
            title.pageTitle = nameObj['Account-EditDetails'] ? nameObj['Account-EditDetails'].pageTitle : currentSitePipeline;
            pageMetaHelper.setPageMetaData(req.pageMetaData, title);
        }
        if (req.currentCustomer.profile) {
            userFirstName = req.currentCustomer.profile.firstName;
            userLastName = req.currentCustomer.profile.lastName;
            email = req.currentCustomer.profile.email;
            phone = req.currentCustomer.profile.phone;
            zipCode = customer.getProfile().custom.zipCode;
        }
        var eligibilityHelper = require('*/cartridge/scripts/helpers/eligibilityHelper');
        var memberDetails = {};
        memberDetails.email = email;
        memberDetails.requestSource = 'login';
        eligibilityHelper.getCustomerDetails(memberDetails);
        var communicationPreference = session.privacy.communicationInstruction || 'mail';
        memberId = session.privacy.subscriberId || '';
        var aarpSubscriberID = session.privacy.AARPSubscriberId || '';
        var healthPlanName = session.privacy.healthPlanName || '';
        res.render('account/editProfile', {
            actionURL: URLUtils.url('Account-SubmitDetails').toString(),
            userFirstName: userFirstName,
            userLastName: userLastName,
            email: email,
            communicationPreference: communicationPreference,
            zipCode: zipCode,
            memberId: memberId,
            phone: phone,
            healthPlanName: healthPlanName,
            aarpSubscriberID: aarpSubscriberID
        });
        next();
    }, pageMetaData.computedPageMetaData);

/**
 * Account-SubmitDetails : The Account-SubmitDetails endpoint renders the page that allows a shopper to edit their profile. The edit profile form is prefilled with the shopper's first name, last name and email
 * @name Base/Account-SubmitDetails
 * @function
 * @memberof Account
 * @param {middleware} - userLoggedIn.validateLoggedIn
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.post('SubmitDetails',
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var Transaction = require('dw/system/Transaction');
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var URLUtils = require('dw/web/URLUtils');
        var eligibilityHelper = require('*/cartridge/scripts/helpers/eligibilityHelper');
        var currentSiteID = Site.current.ID;
        var currentSitePipeline = 'Sites-' + currentSiteID + '-Site';
        var preferences = require('*/cartridge/config/preferences.js');
        var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
        if (req.pageMetaData.title === currentSitePipeline) {
            var nameObj = JSON.parse(preferences.pageMetaTitle);
            var title = {};
            title.pageTitle = nameObj['Account-SubmitDetails'] ? nameObj['Account-SubmitDetails'].pageTitle : currentSitePipeline;
            pageMetaHelper.setPageMetaData(req.pageMetaData, title);
        }
        var email = '';
        var customer;

        if (req.currentCustomer.profile) {
            email = req.currentCustomer.profile.email;
            customer = CustomerMgr.getCustomerByCustomerNumber(
                req.currentCustomer.profile.customerNo
            );
        }
        var profile = customer.getProfile();

        var externalProfile = {};
        externalProfile.custom_attributes = {};
        var formData = JSON.parse(req.form.data);
        externalProfile.zipCode = formData.userZip;
        externalProfile.email = email;
        externalProfile.subscriberId = formData.memberId;
        externalProfile.phoneNumber = formData.userPhone;
        externalProfile.healthPlanName = formData.healthplanName;
        externalProfile.AARP_Subscriber_ID = formData.aarpmemberId;
        session.privacy.communicationInstruction = formData.communicationPreference || '';
        externalProfile.communicationPreference = formData.communicationPreference;
        externalProfile.requestSource = 'editProfile';
        var responseObj = eligibilityHelper.getCustomerDetails(externalProfile);
        if (responseObj && responseObj != null) {
            Transaction.wrap(function () {
                profile.setPhoneHome(responseObj.home_phone ? responseObj.home_phone : formData.userPhone);
                profile.custom.sfdcContactID = responseObj.sfdcContactId ? responseObj.sfdcContactId : '';
                profile.custom.zipCode = responseObj.ZipCode ? responseObj.ZipCode : formData.userZip;
            });
        }

        res.json({
            redirectUrl: URLUtils.https('Account-Show').toString()
        });
        next();
    }, pageMetaData.computedPageMetaData);

module.exports = server.exports();

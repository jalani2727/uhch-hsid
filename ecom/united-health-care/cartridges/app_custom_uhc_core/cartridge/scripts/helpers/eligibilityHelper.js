'use strict';

var StringUtils = require('dw/util/StringUtils');
var Calendar = require('dw/util/Calendar');
var Logger = require('dw/system/Logger');

/**
 * helper for the middleware api
 * @param {Object} externalProfile - Object
 * @returns {Object} middleware API response
 */
function getMiddleware(externalProfile) {
    var middlewareAPIResponse = '';
    var sfdc = externalProfile.sfdcContactID;
    var middlewareRequest = {
        sfdc_contact_id: sfdc,
        subnum: externalProfile.source ? externalProfile.AARP_Subscriber_ID : '',
        source: externalProfile.source ? externalProfile.source : 0
    };
    var middleware = require('*/cartridge/scripts/services/MiddlewareService');
    var middlewareAPI = middleware.call(middlewareRequest, false);
    if (middlewareAPI.error === 401) {
        middlewareAPI = middleware.call(middlewareRequest, true);
    }
    if (middlewareAPI.errorMessage) {
        if (middlewareAPI.errorMessage.includes('SocketTimeoutException') || middlewareAPI.errorMessage.includes('ConnectTimeoutException')) {
            session.privacy.eligibilityTimeout = true;
        }
    }
    if (middlewareAPI.status === 'OK') {
        middlewareAPIResponse = middlewareAPI.object.resource ? middlewareAPI.object.resource[0] : middlewareAPI.object;
    }
    Logger.debug('Middleware API {0}', JSON.stringify(middlewareAPIResponse));
    return middlewareAPIResponse;
}

/**
 * helper for the Eligibility api
 * @param {Object} externalProfile - Object
 * @param {Object} middlewareAPIResponse - Object
 * @returns {Object} Eligibility API response
 */
function getEligibility(externalProfile) {
    var Site = require('dw/system/Site');
    var currentSiteID = Site.current.ID;
    var eligibilityRequest;
    var hsIdUUID;
    if (customer && session.privacy.hsIdUUID == null) {
        hsIdUUID = customer.getProfile().credentials.externalID;
    } else {
        hsIdUUID = session.privacy.hsIdUUID;
    }
    if (externalProfile.requestSource === 'registration') {
        eligibilityRequest = {
            lastName: externalProfile.family_name,
            firstName: externalProfile.given_name,
            doB: StringUtils.formatCalendar(new Calendar(new Date(externalProfile.birthdate)), 'yyyy-MM-dd'),
            zipCode: externalProfile.zipCode,
            email: externalProfile.email,
            phoneNumber: externalProfile.phoneNumber,
            noInsurance: externalProfile.noInsurance,
            hsIdUUID: hsIdUUID,
            subscriberId: externalProfile.subscriberId,
            healthPlanName: externalProfile.healthPlanName,
            siteId: currentSiteID,
            requestSource: externalProfile.requestSource,
            aarpSubscriberId: externalProfile.AARP_Subscriber_ID
        };
        session.privacy.healthPlanName = externalProfile.healthPlanName || '';
    } else if (externalProfile.requestSource === 'editProfile') {
        eligibilityRequest = {
            zipCode: externalProfile.zipCode,
            email: externalProfile.email,
            siteId: currentSiteID,
            hsIdUUID: hsIdUUID,
            subscriberId: externalProfile.subscriberId,
            healthPlanName: externalProfile.healthPlanName,
            phoneNumber: externalProfile.phoneNumber,
            communication_Instruction: externalProfile.communicationPreference,
            requestSource: 'EditProfile',
            aarpSubscriberId: externalProfile.AARP_Subscriber_ID
        };
        session.privacy.healthPlanName = externalProfile.healthPlanName || '';
    } else if (externalProfile.requestSource === 'preRegistration') {
        eligibilityRequest = {
            email: externalProfile.email,
            hsIdUUID: hsIdUUID,
            siteId: currentSiteID,
            requestSource: externalProfile.requestSource
        };
    } else if (externalProfile.requestSource === 'login') {
        eligibilityRequest = {
            email: externalProfile.email,
            hsIdUUID: hsIdUUID,
            siteId: currentSiteID,
            requestSource: externalProfile.requestSource
        };
    } else if (externalProfile.requestSource === 'healthPlanCheck') {
        eligibilityRequest = {
            lastName: externalProfile.lastName,
            firstName: externalProfile.firstName,
            subscriberId: externalProfile.subscriberId,
            email: externalProfile.email,
            hsIdUUID: hsIdUUID,
            siteId: currentSiteID,
            requestSource: externalProfile.requestSource
        };
    }
    var eligibilityMember = require('*/cartridge/scripts/services/EligibilityCheckService');
    var eligibilityMemberAPI = eligibilityMember.call(eligibilityRequest, false);
    if (eligibilityMemberAPI.error === 401) {
        eligibilityMemberAPI = eligibilityMember.call(eligibilityRequest, true);
    }
    if (eligibilityMemberAPI.errorMessage) {
        if ((eligibilityMemberAPI.errorMessage && eligibilityMemberAPI.errorMessage.includes('SocketTimeoutException')) || eligibilityMemberAPI.errorMessage.includes('ConnectTimeoutException')) {
            session.privacy.eligibilityTimeout = true;
        }
    }
    var eligibilityMemberAPIResponse = eligibilityMemberAPI.object;
    return eligibilityMemberAPIResponse;
}

/**
 * helper for getting the customer details
 * @param {Object} externalProfile - Object
 * @returns {Object} Request body with all needed details
 */
function getCustomerDetails(externalProfile) {
    var eligibilityServiceCallObj = getEligibility(externalProfile);
    if (eligibilityServiceCallObj) {
        if (eligibilityServiceCallObj.No_Member_Exists && eligibilityServiceCallObj.No_Member_Exists === true) {
            session.privacy.memberExists = false;
        } else {
            session.privacy.memberExists = true;
        }
        if (eligibilityServiceCallObj.Opportunity_Id !== null) {
            session.privacy.customerType = 'UHCVerified';
        } else {
            session.privacy.customerType = 'UHCNotVerified';
        }
        session.privacy.pricebook = eligibilityServiceCallObj.Pricebook_Id;
        session.privacy.opportunityId = eligibilityServiceCallObj.Opportunity_Id;
        session.privacy.customerDetails = JSON.stringify(eligibilityServiceCallObj);
        var sessionStorageHelper = require('*/cartridge/scripts/helpers/sessionStorageHelper');
        sessionStorageHelper.setCustomerdetailInSessionLogin(eligibilityServiceCallObj);
        Logger.debug('Customer Details {0}', JSON.stringify(session.privacy.customerDetails));
        return eligibilityServiceCallObj;
    }
    return '';
}

/**
 * helper for the displaying Registration Model
 */
function displayRegistrationModel() {
    var utilHelpers = require('*/cartridge/scripts/helpers/utilHelpers');
    var benefitsType;

    if (session.privacy.customerType === 'UHCVerified') {
        benefitsType = 'benefitsVerified';
    } else if (session.privacy.customerType === 'UHCNotVerified') {
        benefitsType = 'benefitsNotVerified';
    } else {
        benefitsType = 'memberDataOnly';
    }
    utilHelpers.setCookie('registrationType', benefitsType);
    return;
}
/**
 * helper for the updating the PriceBook
 */
function updatePriceBook() {
    if (session.privacy.customerType === 'UHCVerified' && session.privacy.pricebook && session.privacy.pricebook !== null) {
        var priceBookMgr = require('dw/catalog/PriceBookMgr');
        var userPriceBook = priceBookMgr.getPriceBook(session.privacy.pricebook);
        if (userPriceBook) {
            priceBookMgr.setApplicablePriceBooks([userPriceBook]);
        }
    }
    return;
}

module.exports = {
    getCustomerDetails: getCustomerDetails,
    getMiddleware: getMiddleware,
    getEligibility: getEligibility,
    displayRegistrationModel: displayRegistrationModel,
    updatePriceBook: updatePriceBook
};

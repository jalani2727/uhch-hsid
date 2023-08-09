/* eslint-disable no-else-return */
/* eslint-disable no-param-reassign */
'use strict';

var base = module.superModule;


/**
 * helper for the setting the aarp customer type
 */
function setAARPCustomerType() {
    if (session.privacy.AARP_Member === 'true') {
        session.privacy.customerType = 'AARPVerified';
    } else if (session.privacy.AARP_Member === 'false') {
        session.privacy.customerType = 'AARPNotVerified';
    } else {
        session.privacy.customerType = 'AARPNoData';
    }
    return;
}
/**
 * helper for getting the customer details
 * @param {Object} externalProfile - Object
 * @returns {Object} Request body with all needed details
 */
function getCustomerDetails(externalProfile) {
    var middlewareServiceCallObj = '';
    var sessionStorageHelper = require('*/cartridge/scripts/helpers/sessionStorageHelper');
    if (externalProfile.fromCart && externalProfile.AARP_Subscriber_ID !== null) {
        externalProfile.source = 1;
        externalProfile.sfdcContactID = externalProfile.sfdcContactID;
        externalProfile.AARP_Subscriber_ID = externalProfile.AARP_Subscriber_ID;
        // change get middleware according to new externalprofile values
        middlewareServiceCallObj = base.getMiddleware(externalProfile);
        if (middlewareServiceCallObj && ((middlewareServiceCallObj.code === '1') || (middlewareServiceCallObj.AARP_Member !== 'true'))) {
            middlewareServiceCallObj.error = true;
            return middlewareServiceCallObj;
        }
        session.privacy.AARP_Member = middlewareServiceCallObj.AARP_Member;
    } else {
        var eligibilityServiceCallObj = base.getEligibility(externalProfile);
        if (eligibilityServiceCallObj || !empty(eligibilityServiceCallObj)) {
            if (eligibilityServiceCallObj.No_Member_Exists && eligibilityServiceCallObj.No_Member_Exists === true) {
                session.privacy.memberExists = false;
            } else {
                session.privacy.memberExists = true;
                if (eligibilityServiceCallObj.subscriber_id !== null && eligibilityServiceCallObj.Opportunity_Id !== null && eligibilityServiceCallObj.Pricebook_Id !== null && eligibilityServiceCallObj.sfdcContactId !== null) {
                    session.privacy.subscriberId = eligibilityServiceCallObj.subscriber_id;
                    session.privacy.customerType = 'UHCVerified';
                    session.privacy.pricebook = eligibilityServiceCallObj.Pricebook_Id;
                    session.privacy.opportunityId = eligibilityServiceCallObj.Opportunity_Id;
                    session.privacy.customerDetails = JSON.stringify(eligibilityServiceCallObj);
                } else if (eligibilityServiceCallObj.Pricebook_Id == null && eligibilityServiceCallObj.AARP_Subscriber_ID !== null && eligibilityServiceCallObj.sfdcContactId !== null) {
                    externalProfile.source = 1;
                    externalProfile.sfdcContactID = eligibilityServiceCallObj.sfdcContactId;
                    externalProfile.AARP_Subscriber_ID = eligibilityServiceCallObj.AARP_Subscriber_ID;
                    sessionStorageHelper.setCustomerdetailInSessionLogin(eligibilityServiceCallObj);
                    // change get middleware according to new externalprofile values
                    if (eligibilityServiceCallObj.AARP_Subscriber_ID && eligibilityServiceCallObj.AARP_Subscriber_ID !== '') {
                        middlewareServiceCallObj = base.getMiddleware(externalProfile);
                        if (middlewareServiceCallObj && ((middlewareServiceCallObj.code === '1') || (middlewareServiceCallObj.AARP_Member !== 'true'))) {
                            // middlewareServiceCallObj.error = true;
                            middlewareServiceCallObj.firstName = externalProfile.given_name;
                            middlewareServiceCallObj.lastName = externalProfile.family_name;
                            middlewareServiceCallObj.home_phone = externalProfile.phoneNumber;
                            middlewareServiceCallObj.sfdcContactId = externalProfile.sfdcContactID;
                            middlewareServiceCallObj.ZipCode = eligibilityServiceCallObj.ZipCode;
                            session.privacy.AARP_Member = middlewareServiceCallObj.AARP_Member;
                            setAARPCustomerType();
                            return middlewareServiceCallObj;
                        } else {
                            session.privacy.AARP_Member = middlewareServiceCallObj.AARP_Member;
                            setAARPCustomerType();
                        }
                    }
                    if (eligibilityServiceCallObj.AARP_Subscriber_ID === '') {
                        session.privacy.AARP_Member = false;
                        setAARPCustomerType();
                    }
                } else if (eligibilityServiceCallObj.AARP_Subscriber_ID == null && eligibilityServiceCallObj.Pricebook_Id !== null && externalProfile.requestSource !== 'registration') {
                    session.privacy.memberExists = false;
                }
                sessionStorageHelper.setCustomerdetailInSessionLogin(eligibilityServiceCallObj);
            }
            return eligibilityServiceCallObj;
        }
    }
    return '';
}

/**
 * helper for the displaying Registration Model
 */
function displayRegistrationModel() {
    var utilHelpers = require('*/cartridge/scripts/helpers/utilHelpers');
    var benefitsType;
    if (session.privacy.customerType === 'AARPVerified') {
        benefitsType = 'benefitsVerified';
    } else if (session.privacy.customerType === 'AARPNotVerified') {
        benefitsType = 'benefitsNotVerified';
    } else {
        benefitsType = 'memberDataOnly';
    }
    utilHelpers.setCookie('registrationType', benefitsType);
    return;
}

base.getCustomerDetails = getCustomerDetails;
base.setAARPCustomerType = setAARPCustomerType;
base.displayRegistrationModel = displayRegistrationModel;
module.exports = base;

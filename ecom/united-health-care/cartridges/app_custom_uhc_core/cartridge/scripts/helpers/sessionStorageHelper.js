'use strict';

/**
 * helper for setting Customer detail In Session
 * @param {Object} responseObj - Object
 */
function setCustomerdetailInSessionLogin(responseObj) {
    if (responseObj.dob && responseObj.dob !== null) {
        session.privacy.profilebirthdate = new Date(responseObj.dob);
    }
    if (responseObj.AARP_Subscriber_ID || responseObj.AARP_Subscriber_ID == null || responseObj.AARP_Subscriber_ID === '') {
        session.privacy.AARPSubscriberId = responseObj.AARP_Subscriber_ID || '';
    }
    if (responseObj.subscriber_id || responseObj.subscriber_id == null || responseObj.subscriber_id === '') {
        session.privacy.subscriberId = responseObj.subscriber_id || '';
    }
    if (responseObj.AARP_Member && responseObj.AARP_Member !== null) {
        session.privacy.AARP_Member = responseObj.AARP_Member;
    }
    if (responseObj.sfdcContactId && responseObj.sfdcContactId !== null) {
        session.privacy.sfdcContactId = responseObj.sfdcContactId;
    }
    if (responseObj.Pricebook_Id && responseObj.Pricebook_Id !== null) {
        session.privacy.pricebook = responseObj.Pricebook_Id;
    }
    if (responseObj.Opportunity_Id && responseObj.Opportunity_Id !== null) {
        session.privacy.opportunityId = responseObj.Opportunity_Id;
    }
    if (responseObj.communication_Instruction && responseObj.communication_Instruction !== null) {
        session.privacy.communicationInstruction = responseObj.communication_Instruction;
    }
    if (responseObj.OTCDevicesCoverage && responseObj.OTCDevicesCoverage !== null) {
        session.privacy.OTCDevicesCoverage = responseObj.OTCDevicesCoverage;
    }
    if (responseObj.OTCBenefitRemaining && responseObj.OTCBenefitRemaining !== null) {
        session.privacy.OTCBenefitRemaining = responseObj.OTCBenefitRemaining;
    }
    if (responseObj.healthPlanName && responseObj.healthPlanName !== null) {
        session.privacy.healthPlanName = responseObj.healthPlanName;
    }
    if (responseObj.NewPurchasePossible && responseObj.NewPurchasePossible !== null) {
        session.privacy.NewPurchasePossible = responseObj.NewPurchasePossible;
    }
}

/**
 * helper for setting Customer detail In Session
 * @param {req} req - Object
 */
function setCustomerType(req) {
    if (session.privacy.subscriberId !== null && session.privacy.opportunityId && session.privacy.opportunityId !== null && session.privacy.pricebook != null) {
        req.session.privacyCache.set('customerType', 'UHCVerified');
    } else if (session.privacy.subscriberId !== null && session.privacy.subscriberId !== '') {
        req.session.privacyCache.set('customerType', 'UHCNotVerified');
    } else {
        req.session.privacyCache.set('customerType', 'UHCNoData');
    }
}

module.exports = {
    setCustomerdetailInSessionLogin: setCustomerdetailInSessionLogin,
    setCustomerType: setCustomerType
};

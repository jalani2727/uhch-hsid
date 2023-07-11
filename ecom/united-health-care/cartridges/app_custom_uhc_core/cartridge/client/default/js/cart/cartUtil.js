'use strict';

var otcBenefitStatusValues = {
    BENEFIT_VERIFIED_ONLY: 'benefitVerifiedOnly',
    BENEFIT_APPLIED: 'benefitApplied',
    BENEFIT_NOT_AVAILABLE: 'benefitNotAvailable',
    ELIGIBILITY_IN_PROGRESS: 'eligibilityInProgress',
    ELIGIBILITY_NOT_AVAILABLE: 'eligibilityNotAvailable'
};

/**
 * Display OTC benefit application message
 * @param {string} otcBenefitStatus - holds the OTC Benefit Status
 */
function showOTCBenefitMsg(otcBenefitStatus) {
    // Display different messages according to OTC Benefit application status
    switch (otcBenefitStatus) {
        case otcBenefitStatusValues.BENEFIT_APPLIED:
            $('.benefit-not-available-msg, .eligibility-in-progress-msg, .eligibility-not-available-msg').addClass('d-none');
            $('.benefit-applied-msg').removeClass('d-none');
            break;
        case otcBenefitStatusValues.BENEFIT_NOT_AVAILABLE:
            $('.benefit-applied-msg, .eligibility-in-progress-msg, .eligibility-not-available-msg').addClass('d-none');
            $('.benefit-not-available-msg').removeClass('d-none');
            break;
        case otcBenefitStatusValues.ELIGIBILITY_IN_PROGRESS:
            $('.benefit-applied-msg, .benefit-not-available-msg, .eligibility-not-available-msg').addClass('d-none');
            $('.eligibility-in-progress-msg').removeClass('d-none');
            break;
        case otcBenefitStatusValues.ELIGIBILITY_NOT_AVAILABLE:
            $('.benefit-applied-msg, .benefit-not-available-msg, .eligibility-in-progress-msg').addClass('d-none');
            $('.eligibility-not-available-msg').removeClass('d-none');
            break;
        default:
            $('.benefit-applied-msg, .benefit-not-available-msg, .eligibility-in-progress-msg, .eligibility-not-available-msg').addClass('d-none');
            return;
    }
}

var exportedObjects = { showOTCBenefitMsg };

module.exports = exportedObjects;

'use strict';

var domUtil = require('./domUtil');

// Results container labels
var $resultsContainer = domUtil.$resultsContainer;
var PREFERRED_PROVIDER_LABEL = $resultsContainer.data('preferredProviderLabel');
var STANDARD_PROVIDER_LABEL = $resultsContainer.data('standardProviderLabel');
var MILES_LABEL = $resultsContainer.data('milesLabel');

// Filter container
var $filterContainer = domUtil.$filterContainer;
var FILTER_BY_BRAND_LABEL = $filterContainer.data('filterByBrandLabel');
var FILTER_BY_PROVIDER_LABEL = $filterContainer.data('filterByProviderLabel');
var SELECT_LABEL = $filterContainer.data('selectLabel');

// Practive View Labels
var $practiceView = domUtil.$viewElements.PRACTICE_VIEW;
var GO_BACK_LABEL = $practiceView.data('goBackLabel');
var REQUEST_APPOINTMENT_BUTTON_LABEL = $practiceView.data(
  'requestAnAppointmentLabel'
);
var PROVIDERS_AT_LOCATION_TITLE = $practiceView.data(
  'providersAtLocationTitle'
);
var HOURS_LABEL = $practiceView.data('hoursLabel');
var NPI_LABEL = $practiceView.data('npiLabel');

// Provider View Labels
var $providerView = domUtil.$viewElements.PROVIDER_VIEW;
var GO_BACK_INFO = $providerView.data('goBackInfo');
var SPECIALITY_LABEL = $providerView.data('specialityLabel');
var GENDER_LABEL = $providerView.data('genderLabel');
var PHONE_LABEL = $providerView.data('phoneLabel');
var GETSTARTED_LABEL = $providerView.data('getstartedLabel');
var ACCEPTING_PATIENTS_LABEL = $providerView.data('acceptingPatientsLabel');
var LANGUAGUES_SPOKEN_LABEL = $providerView.data('languagesSpokenLabel');
var VIRTUALCARE_SERVICE_LABEL = $providerView.data('serviceVirtualcareLabel');
var RELATE_SERVICE_LABEL = $providerView.data('serviceRelateLabel');
var PEDIATRICS_SERVICE_LABEL = $providerView.data('servicePediatricsLabel');
var SAMEDAYFIT_SERVICE_LABEL = $providerView.data('serviceSamedayfitLabel');
var MOBILEPROVIDER_SERVICE_LABEL = $providerView.data('serviceMobileproviderLabel');
var INOFFICEPAYMENTS_SERVICE_LABEL = $providerView.data('serviceInofficepaymentsLabel');
var YES_LABEL = $providerView.data('yesLabel');
var NO_LABEL = $providerView.data('noLabel');

// Virtual Hearing test check
var $virtualHearingCheck = domUtil.$virtualHearingCheck;
var FILE_SIZE_ERROR = $virtualHearingCheck.data('fileSizeError');
var FILE_FORMAT_ERROR = $virtualHearingCheck.data('fileFormatError');
var FILE_UPLOAD_ERROR = $virtualHearingCheck.data('fileUploadError');

module.exports = {
    LABELS: {
        GO_BACK: GO_BACK_LABEL,
        REQUEST_APPOINTMENT: REQUEST_APPOINTMENT_BUTTON_LABEL,
        HOURS: HOURS_LABEL,
        NPI: NPI_LABEL,
        SPECIALITY: SPECIALITY_LABEL,
        GENDER: GENDER_LABEL,
        PHONE: PHONE_LABEL,
        GETSTARTED: GETSTARTED_LABEL,
        ACCEPTING_PATIENTS: ACCEPTING_PATIENTS_LABEL,
        LANGUAGUES_SPOKEN: LANGUAGUES_SPOKEN_LABEL,
        // Service labels
        VIRTUALCARE_SERVICE: VIRTUALCARE_SERVICE_LABEL,
        RELATE_SERVICE: RELATE_SERVICE_LABEL,
        PEDIATRICS_SERVICE: PEDIATRICS_SERVICE_LABEL,
        SAMEDAYFIT_SERVICE: SAMEDAYFIT_SERVICE_LABEL,
        MOBILEPROVIDER_SERVICE: MOBILEPROVIDER_SERVICE_LABEL,
        INOFFICEPAYMENTS_SERVICE: INOFFICEPAYMENTS_SERVICE_LABEL,
        // Filter labels
        FILTER_BY_BRAND: FILTER_BY_BRAND_LABEL,
        FILTER_BY_PROVIDER: FILTER_BY_PROVIDER_LABEL,
        SELECT: SELECT_LABEL,
        // Results labels
        PREFERRED_PROVIDER: PREFERRED_PROVIDER_LABEL,
        STANDARD_PROVIDER: STANDARD_PROVIDER_LABEL,
        MILES: MILES_LABEL,
        YES: YES_LABEL,
        NO: NO_LABEL

    },
    TITLE: {
        PROVIDERS_AT_LOCATION: PROVIDERS_AT_LOCATION_TITLE
    },
    INFO: {
        GO_BACK: GO_BACK_INFO
    },
    ERROR_MSG: {
        FILE_SIZE_ERROR: FILE_SIZE_ERROR,
        FILE_FORMAT_ERROR: FILE_FORMAT_ERROR,
        FILE_UPLOAD_ERROR: FILE_UPLOAD_ERROR
    }
};

'use strict';

var providerSearchUtil = require('../common');
var domUtil = require('../utils/domUtil');
var labelUtil = require('../utils/labelsUtil');

var $practiceView = domUtil.$viewElements.PRACTICE_VIEW;
var requestAppointmentUrl = $practiceView.data('requestAppointmentActionUrl');
var $providerView = domUtil.$viewElements.PROVIDER_VIEW;
var licenseTypeMap = $providerView.data('licenseTypeMap');
var LABELS = labelUtil.LABELS;
var INFO = labelUtil.INFO;
var TITLE = labelUtil.TITLE;

/**
 * Returns HTML string for Provider services
 * @param {Object} provider Provider
 * @returns {string} returns HTML string
 */
function getProviderServicesHTML(provider) {
    var services = provider.services || [];
    return services
        .map(function (service) {
            return `
            <p class="service-item">
                <span class="service-icon service-icon-${service.toLowerCase().replace(/ /g, '-')}"></span>
                <span class="service-name my-auto">${service}</span>
            </p>
        `;
        })
        .join('');
}

/**
 * Returns HTML string for Practice services
 * @param {Array} services Services available at a Practice
 * @returns {string} returns HTML string
 */
function getPracticeServicesHTML(services) {
    return services
        .map(function (service) {
            return `
            <p class="service-item">
                <span class="service-icon service-icon-${service.toLowerCase().replace(/ /g, '-')}"></span>
                <span class="service-name my-auto">${service}</span>
            </p>
        `;
        })
        .join('');
}

/**
 * Returns HTML string for Provider license type values
 * @param {Array} licenseTypes licenseTypes array
 * @returns {string} returns HTML string
 */
function getSpecialityHTML(licenseTypes) {
    return (licenseTypes || []).map(function (licenseType) {
        return licenseTypeMap[licenseType] || licenseType;
    }).join(', ');
}

/**
 * Returns HTML string for Provider properties
 * @param {Object} provider Provider
 * @returns {string} returns HTML string
 */
function getProviderPropertiesHTML(provider) {
    var speciality = getSpecialityHTML(provider.licensetype) || 'N/A';
    var gender = provider.gender || 'N/A';
    var languagesSpoken = (provider.languages || []).join(', ') || 'N/A';
    var phone = provider.phone || 'N/A';
    var acceptingNewPatients = provider.AcceptingNewPatients ? LABELS.YES : LABELS.NO;

    return `
    <div class="provider-properties-section">
        <p>
            <span class="provider-label">${LABELS.SPECIALITY}</span>
            <span>${speciality}</span>
        </p>
        <p>
            <span class="provider-label">${LABELS.GENDER}</span>
            <span>${gender}</span>
        </p>
        <p>
            <span class="provider-label">${LABELS.ACCEPTING_PATIENTS}</span>
            <span>${acceptingNewPatients}</span>
        </p>
        <p>
            <span class="provider-label">${LABELS.LANGUAGUES_SPOKEN}</span>
            <span>${languagesSpoken}</span>
        </p>
        <p>
            <span class="provider-label">${LABELS.PHONE}</span>
            <span>${phone}</span>
        </p>
    </div>`;
}

/**
 * Returns HTML string for Provider View
 * @param {Object} provider Provider
 * @param {string} practiceId Practice Id
 * @returns {string} returns HTML string
 */
function getProviderViewHTML(provider, practiceId) {
    var providerPropertiesHTML = getProviderPropertiesHTML(provider);
    var serviceListHTML = getProviderServicesHTML(provider);
    var getStartedphone = '';
    if ($('.html-slot-container-phonenumber').length) {
        if ($('.html-slot-container-phonenumber').length > 1) {
            getStartedphone = $('.html-slot-container-phonenumber').first().text().trim();
        } else {
            getStartedphone = $('.html-slot-container-phonenumber').text().trim();
        }
    }
    return `
    <div class="provider-cta-container">
        <button class="btn btn-primary goto-practice-view" 
            data-practice-id="${practiceId}">${LABELS.GO_BACK}</button>
        <p>${INFO.GO_BACK}</p>
    </div>
    
    <div class="provider-detail-section">
        <h3 class="practice-provider-title">${provider.providerName}</h3>
    </div>
    
    ${providerPropertiesHTML}
    ${serviceListHTML}

    <p>
        <span class="provider-label">${LABELS.GETSTARTED}</span>
        <span>${getStartedphone}</span>
    </p>
    `;
}

/**
 * Returns HTML string for Providers List in Practice View
 * @param {Array} providers Provider
 * @param {string} practiceId PracticeId
 * @returns {string} returns HTML string
 */
function getProvidersListHTML(providers, practiceId) {
    return providers
        .map(function (provider, index) {
            return `<div class="practice-provider">
                    <a href="javascript:void(0);" class="provider-name goto-provider-view" 
                        data-practice-id="${practiceId}" 
                        data-provider-id="${index}">${provider.providerName}</a>
                    <div class="provider-address"></div>
                    <div class="provider-npi">${LABELS.NPI
                } ${provider.NPI || ''}</div>
                </div>`;
        })
        .join('');
}

/**
 * Returns HTML string for Practice Detail section
 * @param {Object} practice Practice
 * @returns {string} returns HTML string
 */
function getPracticeDetailHTML(practice) {
    var markerImageUrl = providerSearchUtil.getMarkerImageUrl(practice);
    var preferredMarkerAltText = providerSearchUtil.isPreferredProvider(practice)
        ? LABELS.PREFERRED_PROVIDER
        : LABELS.STANDARD_PROVIDER;
    var distanceRounded = practice.distance.toFixed(1);
    var getStartedphone = '';
    if ($('.html-slot-container-phonenumber').length) {
        if ($('.html-slot-container-phonenumber').length > 1) {
            getStartedphone = $('.html-slot-container-phonenumber').first().text().trim();
        } else {
            getStartedphone = $('.html-slot-container-phonenumber').text().trim();
        }
    }

    var url = new URL(requestAppointmentUrl);
    url.searchParams.set('address', practice.address);
    url.searchParams.set('practiceId', practice.practiceId);
    var acceptingNewPatients = practice.AcceptingNewPatients ? LABELS.YES : LABELS.NO;
    var address = providerSearchUtil.splitAddress(practice.address, 3);

    return `
        <div class="practice-detail-section" practice-id="${practice.practiceId}">
            <div class="row">
                <div class="col-2">
                    <img class="marker-icon-result" src="${markerImageUrl}" alt="${preferredMarkerAltText}"/>
                </div>
                <div class="col-7 lr-padding-zero">
                    <h1 class="practice-name">${practice.practiceName}</h1>
                    <p class="practice-address mb-0">${address.addressLine1}</p>
                    <p class="practice-address mb-0">${address.addressLine2}</p>
                    <p class="practice-address">${address.addressLine3}</p>
                    <p class="practice-phone-number">${LABELS.GETSTARTED} ${getStartedphone}</p>
                    <p class="practice-hours">${LABELS.HOURS} ${practice.hours}</p>
                    <p class="practice-accepting-patients"><span class="uhc-sans-700">${LABELS.ACCEPTING_PATIENTS}</span> ${acceptingNewPatients} </p>
                    <div class="practice-level-services my-4 pb-lg-1"></div>
                </div>
                <div class="col-3">
                    <p class="practice-distance">${distanceRounded} ${LABELS.MILES}</p>
                </div>
            </div>
            <div class="row">
                <div class="offset-lg-2 col-lg-6 col-12 px-lg-0 rqst-btn-container">
                    <a href="${url.href}" class="btn btn-block btn btn-outline-primary request-appointment-cta ${acceptingNewPatients === 'No' ? 'btn-primary disabled' : 'btn-outline-primary'} ">${LABELS.REQUEST_APPOINTMENT}</a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Returns HTML string for Practice View
 * @param {Object} result Result object
 * @returns {string} returns HTML string
 */
function getPracticeViewTemplate(result) {
    var practiceId = result.practiceId;
    var practiceDetailHTML = getPracticeDetailHTML(result);
    var providersListHTML = getProvidersListHTML(result.providers, practiceId);

    return `
        <button class="btn btn-primary goto-results-view">${LABELS.GO_BACK}</button>
        ${practiceDetailHTML}

        <div class="practice-providers-list-section">
            <div class="row">
                <div class="offset-2 col-10">
                    <h3 class="practice-provider-title">${TITLE.PROVIDERS_AT_LOCATION}</h3>
                    ${providersListHTML}
                </div>
            </div>
        </div>
    `;
}

module.exports = {
    getPracticeViewTemplate: getPracticeViewTemplate,
    getProviderViewHTML: getProviderViewHTML,
    getPracticeServicesHTML: getPracticeServicesHTML
};

'use strict';

var providerSearchUtil = require('../common');
var domUtil = require('../utils/domUtil');
var LABELS = require('../utils/labelsUtil').LABELS;

var $practiceView = domUtil.$viewElements.PRACTICE_VIEW;
var requestAppointmentUrl = ($practiceView && $practiceView.data('requestAppointmentActionUrl') ? $practiceView.data('requestAppointmentActionUrl') : '');

/**
 * Returns HTML string for a single practice list item
 * @param {Object} result Practice object
 * @param {string} markerImageUrl image url
 * @returns {string} returns HTML string
 */
function getResultsListItemTemplate(result, markerImageUrl) {
    var responseHtml = '';
    if ($practiceView && $practiceView.data('requestAppointmentActionUrl')) {
        var preferredMarkerAltText = providerSearchUtil.isPreferredProvider(result)
        ? LABELS.PREFERRED_PROVIDER
        : LABELS.STANDARD_PROVIDER;
        var distanceRounded = result.distance.toFixed(1);
        var url = new URL(requestAppointmentUrl);
        url.searchParams.set('address', result.address);
        url.searchParams.set('practiceId', result.practiceId);
        var acceptingNewPatients = result.AcceptingNewPatients ? LABELS.YES : LABELS.NO;
        var address = providerSearchUtil.splitAddress(result.address, 3);

        responseHtml = `
        <div class="list-item">
            <div class="row">
                <div class="col-2">
                    <img class="marker-icon" src="${markerImageUrl}" alt="${preferredMarkerAltText}"/>
                </div>
                <div class="col-6 lr-padding-zero">
                <h3><a class="practice-name goto-practice-view" data-practice-id="${result.practiceId}" href="javascript:void(0)">${result.practiceName}</a></h3>
                <p class="practice-address">${address.addressLine1}</p>
                <p class="practice-address">${address.addressLine2}</p>
                <p class="practice-address">${address.addressLine3}</p>
                <p class="my-4 practice-accepting-patients"><span class="uhc-sans-700">${LABELS.ACCEPTING_PATIENTS}</span> ${acceptingNewPatients} </p>
            </div>
            <div class="col-4">
                <p class="practice-distance">${distanceRounded} ${LABELS.MILES}</p>
            </div>
            </div>
            <div class="row">
                <div class="offset-lg-2 col-lg-6 col-12 px-lg-0 rqst-btn-container">
                    <a href="${url.href}" class="btn btn-block request-appointment-cta mb-2 px-0 ${acceptingNewPatients === 'No' ? 'btn-primary disabled' : 'btn-outline-primary'}">${LABELS.REQUEST_APPOINTMENT}</a>
                </div>
            </div>
        </div>
        `;
    }
    return responseHtml;
}

/**
 * Returns HTML string for practices array
 * @param {Array} results Practices array
 * @param {Object} $mapEl jquery object
 * @returns {string} returns HTML string
 */
function getResultsListTemplate(results, $mapEl) {
    return results
        .map(function (practice) {
            var markerImageUrl = providerSearchUtil.getMarkerImageUrl(practice, $mapEl);
            return getResultsListItemTemplate(practice, markerImageUrl);
        })
        .join('');
}

module.exports = {
    getResultsListTemplate: getResultsListTemplate
};

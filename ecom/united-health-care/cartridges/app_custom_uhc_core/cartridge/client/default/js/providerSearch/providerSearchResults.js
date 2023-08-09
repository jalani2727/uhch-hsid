'use strict';

var map = require('./providerSearchMap');
var viewSwitcher = require('./viewSwitcher');
var filterTemplateUtil = require('./templates/filterTemplateUtil');
var resultsTemplateUtil = require('./templates/resultsTemplateUtil');
var viewsTemplatesUtil = require('./templates/viewsTemplatesUtil');

var domUtil = require('./utils/domUtil');
var providerSearchUtil = require('./common');
var $body = domUtil.$body;
var views = domUtil.views;
var viewCtaSelectors = domUtil.viewCtaSelectors;
var $viewElements = domUtil.$viewElements;
var $uploadHearingTestFile = domUtil.$uploadFileContainer;
var $fileUploadError = domUtil.$fileUploadError;

var data = require('./data');
var practices = data.practices;
var normalizedPractices = data.normalizedPractices;
var brandsDropdownValues = data.brandsDropdownValues;
var providersDropdownValues = data.providersDropdownValues;

var labels = require('./utils/labelsUtil');

var fileUploadUtil = require('./utils/fileUploadUtil');

/**
 * Renders the filter section
 */
function renderFilters() {
    var brands = Array.from(brandsDropdownValues);
    var brandsSorted = brands.sort();
    var providers = Array.from(providersDropdownValues);

    var filterHTML = filterTemplateUtil.getFiltersTemplate(brandsSorted, providers);
    $('.filter-container').html(filterHTML);
}

/**
 * Display address on Request Appointment form
 */
function displayAddressOnAppointmentForm() {
    if ($('.formatted-address') && $('.formatted-address').data('unformattedAddress')) {
        var unformattedAddress = $('.formatted-address').data('unformattedAddress');
        var completeAddress = providerSearchUtil.splitAddress(unformattedAddress, 3);
        var formattedAddressHtml =
            `<isif condition="${completeAddress.isAddressLine1}">
            <p class="lr-padding-zero user-address-line-1 ${completeAddress.isAddressLine2 ? 'mb-0' : ''}">
                ${completeAddress.addressLine1}
            </p>
        </isif>
        <isif condition="${completeAddress.isAddressLine2}">
            <p class="lr-padding-zero user-address-line-2 ${completeAddress.isAddressLine3 ? 'mb-0' : ''}">
                ${completeAddress.addressLine2}
            </p>
        </isif>
        <isif condition="${completeAddress.isAddressLine3}">
            <p class="lr-padding-zero user-address-line-3">
                ${completeAddress.addressLine3}
            </p>
        </isif>`;
        $('.formatted-address').html(formattedAddressHtml);
    }
}

/**
 * Renders the resultsList section
 * @param {Array} _practices Results array
 */
function renderResults(_practices) {
    var resultsHTML = resultsTemplateUtil.getResultsListTemplate(
        _practices || practices
    );
    $('.results-container').html(resultsHTML);
}

/**
 * Updates the filteredResults based on selected brand and selected Provider
 * @param {string} selectedBrand brandName
 * @param {string} selectedProvider providerType
 */
function updateResults(selectedBrand, selectedProvider) {
    var filteredResults = data.filterPractices(selectedBrand, selectedProvider);
    renderResults(filteredResults);
    map.updateMarkers(filteredResults);
}

/**
 * Initilizale onchange events on client side filters
 */
function initializeFilterChangeEvents() {
    var noIsurance = $('#no-insurance');
    var selectedBrand = '';
    var selectedProvider = '';
    var fileFormatError = labels.ERROR_MSG.FILE_FORMAT_ERROR && labels.ERROR_MSG.FILE_FORMAT_ERROR !== undefined && labels.ERROR_MSG.FILE_FORMAT_ERROR !== null ? (labels.ERROR_MSG.FILE_FORMAT_ERROR).split(':') : '';
    var fileFormatErrorMsg = fileFormatError !== '' ? fileFormatError[0].concat(': ') + fileFormatError[1].replaceAll('.', '').concat('.') : '';

    $body.on('change', '#brand-filter', function (e) {
        selectedBrand = e.target.value;
        updateResults(selectedBrand, selectedProvider);
    });

    $body.on('change', '#provider-filter', function (e) {
        selectedProvider = e.target.value;
        updateResults(selectedBrand, selectedProvider);
    });

    $body.on('change', noIsurance, function () {
        var insuranceInputs = $('#health-plan-insurer, #health-plan-member-id, #other-insurer');
        if (noIsurance.is(':checked')) {
            insuranceInputs.val('').attr('disabled', true).removeClass('is-invalid');
        } else {
            insuranceInputs.removeAttr('disabled');
        }
    });
    $body.on('submit', 'form.req-appt-form', function (e) {
        var value = $('.hearing-test-question').val();
        if (document.getElementById('hearing-test-file').files.length === 0 && value === 'yes') {
            e.preventDefault();
            $fileUploadError.removeClass('d-none');
        } else {
            $fileUploadError.classList.toggle('d-none');
        }
    });

    $body.on('change', '.hearing-test-question', function (e) {
        $fileUploadError.addClass('d-none');
        fileUploadUtil.clearFileUploadLabels();
        if ((e.target.value).toLowerCase() === 'yes') {
            $uploadHearingTestFile.removeClass('d-none');
        } else {
            var uploadedFile = document.getElementById('hearing-test-file');
            uploadedFile.value = null;
            $uploadHearingTestFile.addClass('d-none');
        }
    });

    $body.on('change', '.hearing-test-file', function (e) {
        var currentTarget = e.currentTarget;
        var uploadedFile;
        fileUploadUtil.clearFileUploadLabels();
        if (!currentTarget.value) {
            $('.file-upload-label').removeClass('d-none');
        } else {
            $('.file-upload-label').addClass('d-none');
        }
        if ('files' in currentTarget) {
            var files = currentTarget.files;
            var allowedfilelength = parseInt($('input[name=allowed-file-length]').val(), 10) * 1000000;
            if (files[0] && files[0].size > allowedfilelength) {
                $('.upload-file-error').text('<span class="file-upload-error" style="color:red;">' + labels.ERROR_MSG.FILE_SIZE_ERROR + parseInt($('input[name=allowed-file-length]').val(), 10) + 'MB.</span>');
                uploadedFile = document.getElementById('hearing-test-file');
                uploadedFile.value = null;
                return;
            }

            let isValidFileFormat = fileUploadUtil.validateFileFormat(document.getElementById('hearing-test-file'));

            // check if upload file format is accepted
            if (!isValidFileFormat) {
                $('.upload-file-error').text('<span class="file-upload-error" style="color:red; font-size:16px;">' + fileFormatErrorMsg + '</span>');
                uploadedFile = document.getElementById('hearing-test-file');
                uploadedFile.value = null;
                return;
            }
            fileUploadUtil.setFile(files[0]);
            // to display name of the uploaded file
            $('.file-name-container').append(
                '<span class="file-name">' + files[0].name + '</span>'
            );
            $('.check-mark-success').css('visibility', 'visible');
            $fileUploadError.addClass('d-none');
        }
    });
}

/**
 * Attach event on provider type radio buttons.
 */
function initializeViewChangeEvents() {
    $viewElements.RESULTS_VIEW.on(
        'click',
        viewCtaSelectors.GOTO_PRACTICE_VIEW,
        function (e) {
            var practiceId = $(e.target).data('practiceId');
            var selectedPractice = normalizedPractices.get(practiceId);

            var practiceViewHTML = viewsTemplatesUtil.getPracticeViewTemplate(selectedPractice);
            $('.provider-search-content').find($viewElements.PRACTICE_VIEW).html(practiceViewHTML);
            viewSwitcher.switchView(views.PRACTICE_VIEW);
        }
    );

    $viewElements.PRACTICE_VIEW.on(
        'click',
        viewCtaSelectors.GOTO_RESULTS_VIEW,
        function () {
            $('.provider-search-content').find($viewElements.PRACTICE_VIEW).html('');
            viewSwitcher.switchView(views.RESULTS_VIEW);
        }
    );

    $body.on('click', viewCtaSelectors.GOTO_PRACTICE_VIEW, function (e) {
        var practiceServices = [];
        var servicesHtml = '';
        var practiceId = $(e.target).data('practiceId');
        var selectedPractice = normalizedPractices.get(practiceId);
        var selectedPracticeBrands = selectedPractice.brand && selectedPractice.brand.length > 0 ? selectedPractice.brand : [];

        // If more brands are to be considered, add brands in brandsList.
        var brandsList = ['Relate'];
        var practiceProviders = selectedPractice.providers;

        // Brands will be added in practiceServices.
        practiceServices = providerSearchUtil.addPracticeBrands(brandsList, selectedPracticeBrands);

        // Traversing through all providers of selected Practice to add services from providers at Practice level.
        for (let provider of practiceProviders) {
            if (provider.services && provider.services.length > 0) {
                for (let service of provider.services) {
                    if (!practiceServices.includes(service)) {
                        practiceServices.push(service);
                    }
                }
            }
        }

        servicesHtml = viewsTemplatesUtil.getPracticeServicesHTML(practiceServices);
        $('.practice-level-services').html(servicesHtml);
    });

    $viewElements.PRACTICE_VIEW.on(
        'click',
        viewCtaSelectors.GOTO_PROVIDER_VIEW,
        function (e) {
            var practiceId = $(e.target).data('practiceId');
            var providerId = $(e.target).data('providerId');
            var selectedPractice = normalizedPractices.get(practiceId);
            var selectedProvider = (selectedPractice.providers || [])[providerId];

            var providerViewHTML = viewsTemplatesUtil.getProviderViewHTML(selectedProvider, practiceId);
            $('.provider-search-content').find($viewElements.PROVIDER_VIEW).html(providerViewHTML);
            viewSwitcher.switchView(views.PROVIDER_VIEW);
        }
    );

    $viewElements.PROVIDER_VIEW.on(
        'click',
        viewCtaSelectors.GOTO_PRACTICE_VIEW,
        function (e) {
            var practiceId = $(e.target).data('practiceId');
            var selectedPractice = normalizedPractices.get(practiceId);

            var practiceViewHTML = viewsTemplatesUtil.getPracticeViewTemplate(selectedPractice);
            $('.provider-search-content').find($viewElements.PRACTICE_VIEW).html(practiceViewHTML);
            viewSwitcher.switchView(views.PRACTICE_VIEW);
        }
    );
}

/**
 * Disable fields in Request appointment form
 */
function disableFields() {
    var noIsurance = $('#no-insurance');
    $body.on('change', noIsurance, function () {
        var insuranceInputs = $('#health-plan-insurer, #health-plan-member-id, #other-insurer');
        if (noIsurance.is(':checked')) {
            insuranceInputs.val('').attr('disabled', true).removeClass('is-invalid');
        } else {
            insuranceInputs.removeAttr('disabled');
        }
    });
}

module.exports = {
    renderFilters: renderFilters,
    renderResults: renderResults,
    initializeFilterChangeEvents: initializeFilterChangeEvents,
    initializeViewChangeEvents: initializeViewChangeEvents,
    disableFields: disableFields,
    displayAddressOnAppointmentForm: displayAddressOnAppointmentForm
};

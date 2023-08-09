'use strict';

var util = require('./util');
var $otherHealthPlan = $('.other-health-plan-value-container');
var $allFormInputFields = $('form input');
var $noIsuranceInput = $('#no-insurance');
var $healthPlanNameInput = $('#health-plan-name');
var $otherHealthPlanInput = $('#other-health-plan');
var $memberIdInput = $('#member-id');
var otherHealthPlanValue = $('.create-account-page').attr('data-health-plan-other');
var $allInsuranceInputs = $('#other-health-plan, #health-plan-name, #member-id');
var dateToday = new Date();
var maxDateAllowedAsDob = new Date();
maxDateAllowedAsDob.setFullYear(maxDateAllowedAsDob.getFullYear() - 13);
var minDateAllowedAsDob = new Date('1900-01-01T00:00:00');
var maxDobAllowedErrorMsg = $('.create-account-page').attr('data-max-dob-allowed-error-msg');
var futureDateErrorMsg = $('.create-account-page').attr('data-future-dob-error-msg');
var invalidDateErroMsg = $('.create-account-page').attr('data-invalid-dob-date');

/**
 * onBlurEvents
 */
function onBlurEvents() {
    $('.btn-create-account').attr('disabled', true);

    $('#user-first-name, #user-last-name').on('blur change', function (e) {
        var inputValue = (e.target.value).trim();
        e.preventDefault();
        if (this.validity.valueMissing || inputValue === '') {
            this.setCustomValidity('');
            var validationMessage = $(this).data('value-missing-error');
            $(this).addClass('is-invalid');
            $(this).parents('.form-group').find('.invalid-feedback').text(validationMessage);
        } else {
            $(this).removeClass('is-invalid');
            $(this).parents('.form-group').find('.invalid-feedback').text('');
        }
    });

    $('#user-phone').blur(function (e) {
        var phoneNumberValue = (e.target.value).trim();
        e.preventDefault();
        var validationMessage = '';
        if (this.validity.valueMissing || phoneNumberValue === '') {
            this.setCustomValidity('');
            validationMessage = $(this).data('pattern-mismatch');
            $(this).addClass('is-invalid');
            $(this).parents('.form-group').find('.invalid-feedback').text(validationMessage);
        } else if (phoneNumberValue !== '' && !this.validity.valid) {
            this.setCustomValidity('');
            validationMessage = this.validationMessage;
            $(this).addClass('is-invalid');
            if (this.validity.patternMismatch && $(this).data('pattern-mismatch')) {
                validationMessage = $(this).data('pattern-mismatch');
            }
            $(this).parents('.form-group').find('.invalid-feedback').text(validationMessage);
        } else {
            $(this).removeClass('is-invalid');
            $(this).parents('.form-group').find('.invalid-feedback').text('');
        }
    });

    $('#user-zipcode').blur(function (e) {
        var zipCodeValue = (e.target.value).trim();
        e.preventDefault();
        var validationMessage = '';
        if (this.validity.valueMissing || zipCodeValue === '') {
            this.setCustomValidity('');
            validationMessage = $(this).data('pattern-mismatch');
            $(this).addClass('is-invalid');
            $(this).parents('.form-group').find('.invalid-feedback').text(validationMessage);
        } else if (zipCodeValue !== '' && !this.validity.valid) {
            this.setCustomValidity('');
            validationMessage = this.validationMessage;
            $(this).addClass('is-invalid');
            if (this.validity.patternMismatch && $(this).data('pattern-mismatch')) {
                validationMessage = $(this).data('pattern-mismatch');
            }
            $(this).parents('.form-group').find('.invalid-feedback').text(validationMessage);
        } else {
            $(this).removeClass('is-invalid');
            $(this).parents('.form-group').find('.invalid-feedback').text('');
        }
    });

    $('#user-dob').on('blur change', function (e) {
        e.preventDefault();
        var dobValue = e.target.value;
        var selectedDobValueFormatted = new Date(dobValue);
        var isDobInvalid = selectedDobValueFormatted > maxDateAllowedAsDob && selectedDobValueFormatted <= dateToday;
        var isFutureDobSelected = selectedDobValueFormatted > dateToday;
        var inValidDate = selectedDobValueFormatted < minDateAllowedAsDob;

        if (dobValue !== '') {
            $(this).removeClass('is-invalid');
        }
        if (dobValue !== '' && (inValidDate || isDobInvalid || isFutureDobSelected)) {
            this.setCustomValidity('');
            var validationMessage = this.validationMessage;
            $(this).addClass('is-invalid-input');
            if ($(this).data('range-error')) {
                validationMessage = isDobInvalid ? maxDobAllowedErrorMsg : futureDateErrorMsg;
            }
            if (inValidDate) {
                validationMessage = invalidDateErroMsg;
            }
            $(this).parents('.form-group').find('.invalid-input')[0].style.display = 'inline-block';
            $(this).parents('.form-group').find('.invalid-input').text(validationMessage);
        } else {
            $(this).removeClass('is-invalid-input');
            $(this).parents('.form-group').find('.invalid-input')[0].style.display = 'none';
            $(this).parents('.form-group').find('.invalid-input').text('');
        }
    });
}

/**
 * onChangeEvents
 */
function onChangeEvents() {
    $noIsuranceInput.change(function () {
        $memberIdInput.val('');
        $otherHealthPlanInput.val('');

        if ($noIsuranceInput.is(':checked')) {
            $allInsuranceInputs.attr('disabled', true);
        } else {
            $allInsuranceInputs.removeAttr('disabled');
        }
    });

    $healthPlanNameInput.change(function (e) {
        var selectedHealthPlanName = e.target.value;
        $memberIdInput.val('');

        if (selectedHealthPlanName === otherHealthPlanValue) {
            $otherHealthPlanInput.attr('required', true);
            $otherHealthPlan.removeClass('d-none');
        } else {
            $otherHealthPlanInput.removeAttr('required');
            $otherHealthPlanInput.val('');
            $otherHealthPlan.addClass('d-none');
        }
        util.allowFormSubmit();
    });

    $allFormInputFields.on('keyup change', function () {
        util.allowFormSubmit();
    });
}

/**
 * submitForm - executes the logic hen a form is submitted.
 */
function submitForm() {
    // Submit the details for Registration
    $('form.create-account-form').submit(function (e) {
        e.preventDefault();
        var form = $(this);
        var actionURL = form.attr('action');
        var serializedData = form.serializeArray();
        var parsedData = util.parseData(serializedData);
        $.spinner().start();
        $.ajax({
            url: actionURL,
            type: 'post',
            dataType: 'json',
            data: parsedData,
            beforeSend: function () {
                $.spinner().start();
            },
            success: function (result) {
                $('.create-account-form').trigger('reset');
                window.location.href = result.redirectUrl;
            },
            error: function (err) {
                $('.create-account-form').trigger('reset');
                $.spinner().stop();
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                }
            }
        });
        return true;
    });
}

var exportedObjects = { onChangeEvents, onBlurEvents, submitForm };

module.exports = exportedObjects;

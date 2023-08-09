/* eslint-disable linebreak-style */
'use strict';

var util = require('./util');
var adobeDataLayer = require('adobeDatalayer/datalayer');

/**
 * Verify the details entered by the user.
 */
function accountVerification() {
    // Error messages
    var verifyCaptchaErrorMsg = $('.payment-portal-landing-page').attr('data-verify-captcha-error');

    // Submit the details on landing page of Payment Portal
    $('form.payment-portal-landing-form').submit(function (e) {
        e.preventDefault();

        var recaptchaEnable = $(this).data('recaptchaenable');
        if (recaptchaEnable) {
            $('#g-recaptcha-error').html('');
            var response = window.grecaptcha.getResponse();
            if (response.length === 0) {
                // reCaptcha not verified
                $('.captcha-container').find('#g-recaptcha-error').text('<span>' + verifyCaptchaErrorMsg + '</span>');
                return false;
            }
        }

        var form = $(this);
        var actionURL = form.attr('action');
        var serializedData = form.serializeArray();
        var parsedData = util.parseData(serializedData);
        $.spinner().start();
        $.ajax({
            url: actionURL,
            type: 'post',
            dataType: 'json',
            data: {
                csrf_token: parsedData.csrf_token,
                data: JSON.stringify(parsedData)
            },
            success: function (result) {
                if (window.grecaptcha) {
                    window.grecaptcha.reset();
                }
                adobeDataLayer.methods.formSubmitted();
                if (result.error && result.statusCode && result.statusCode === 2) {
                    $.spinner().stop();
                    $('.error-change-in-cost').removeClass('d-none');
                    $('.error-msg').addClass('d-none');
                    $('.payment-portal-landing-form').trigger('reset');
                } else if (result.error) {
                    let errorHtml = '<span>' + result.errorMsg + '</span>';
                    $.spinner().stop();
                    $('.error-change-in-cost').addClass('d-none');
                    $('.error-msg').removeClass('d-none');
                    $('.error-msg').html(errorHtml);
                    $('.payment-portal-landing-form').trigger('reset');
                } else {
                    $('.payment-portal-landing-form').trigger('reset');
                    var productsStr = (result.products && result.products !== null ? JSON.stringify(result.products) : '');
                    var formData =
                    $('<form>')
                        .appendTo(document.body)
                        .attr({
                            method: 'POST',
                            action: result.continueURL
                        });

                    $('<input>')
                        .appendTo(formData)
                        .attr({
                            name: 'invoiceId',
                            value: result.invoiceId
                        });

                    $('<input>')
                        .appendTo(formData)
                        .attr({
                            name: 'patientName',
                            value: result.patientName
                        });

                    $('<input>')
                    .appendTo(formData)
                    .attr({
                        name: 'invoiceBalance',
                        value: result.invoiceBalance
                    });

                    $('<input>')
                    .appendTo(formData)
                    .attr({
                        name: 'invoiceRecordId',
                        value: result.invoiceRecordId
                    });

                    $('<input>')
                    .appendTo(formData)
                    .attr({
                        name: 'opportunityId',
                        value: result.opportunityId
                    });

                    $('<input>')
                    .appendTo(formData)
                    .attr({
                        name: 'products',
                        value: productsStr
                    });

                    $('<input>')
                    .appendTo(formData)
                    .attr({
                        name: 'emailAddress',
                        value: result.emailAddress
                    });

                    formData.submit();
                }
            },
            error: function (err) {
                $.spinner().stop();
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                }
            }
        });
        return true;
    });
}

/**
 * Prints receipt.
 */
function printReceipt() {
    $('.btn-print-receipt').click(function () {
        util.printPage();
    });
}

var exportedObjects = { accountVerification, printReceipt };

module.exports = exportedObjects;

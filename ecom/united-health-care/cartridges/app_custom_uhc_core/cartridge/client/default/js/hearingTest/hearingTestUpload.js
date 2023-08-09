'use strict';

var util = require('./util');
var dataLayer = require('adobeDatalayer/datalayer');

module.exports = {
    fileUpload: function () {
        // Error messages
        var fileSizeErrorMsg = $('.hearing-test-upload-page').attr('data-file-size-error');
        var fileFormatErrorMsg = $('.hearing-test-upload-page').attr('data-file-format-error');
        var verifyCaptchaErrorMsg = $('.hearing-test-upload-page').attr('data-verify-captcha-error');

        // This is for File upload
        $('#hearing-test-file').change(function (e) {
            e.preventDefault();
            util.clearFileUploadLabels();
            $('.hearing-test-upload-file').find('.upload-file-error').empty();
            var currentTarget = e.currentTarget;
            if ('files' in currentTarget) {
                var files = currentTarget.files;
                var allowedfilelength = parseInt($('input[name=allowed-file-length]').val(), 10) * 1000000;
                if (files[0].size > allowedfilelength) {
                    $('.hearing-test-upload-file').find('.upload-file-error').text('<span class="file-upload-error" style="color:red;">' + fileSizeErrorMsg + parseInt($('input[name=allowed-file-length]').val(), 10) + 'MB. </span>');
                    return;
                }

                let isValidFileFormat = util.validateFileFormat(document.getElementById('hearing-test-file'));

                // check if upload file format is accepted
                if (!isValidFileFormat) {
                    $('.hearing-test-upload-file').find('.upload-file-error').text('<span class="file-upload-error" style="color:red; font-size:16px;">' + fileFormatErrorMsg + '</span>');
                    return;
                }
                util.setFile(files[0]);
                // to display name of the uploaded file
                $('.file-name-container').append(
                    '<span class="file-name">' + files[0].name + '</span>'
                );
                $('.check-mark-success').css('visibility', 'visible');
            }
        });

        // This is for Submitting complete form data
        $('form.hearingtest-result').submit(function (e) {
            e.preventDefault();
            var recaptchaEnable = $(this).data('recaptchaenable');
            if (recaptchaEnable) {
                $('.captcha-container').find('#g-recaptcha-error').html('');
                var response = window.grecaptcha.getResponse();
                if (response.length === 0) {
                    // reCaptcha not verified
                    $('.captcha-container').find('#g-recaptcha-error').text('<span style="color:red;">' + verifyCaptchaErrorMsg + '</span>');
                    return false;
                }
            }
            var form = $(this);
            var url = form.attr('action');
            var formData = new FormData(form[0]);
            formData.append('file', util.getFile());

            // Checks if the file format is supported.
            var isValidFileFormat = util.validateFileFormat(document.getElementById('hearing-test-file'));

            if (isValidFileFormat) {
                $.spinner().start();
                $.ajax({
                    url: url,
                    type: 'post',
                    dataType: 'json',
                    data: formData,
                    contentType: false,
                    processData: false,
                    success: function (result) {
                        if (result.error && result.captchaError) {
                            $.spinner().stop();
                            if (window.grecaptcha) {
                                window.grecaptcha.reset();
                            }
                            $('.captcha-container').find('#g-recaptcha-error').text('<span style="color:red;">' + verifyCaptchaErrorMsg + '</span>');
                        } else if (result.error && result.formatError) {
                            $.spinner().stop();
                            util.clearFileUploadLabels();
                            if (window.grecaptcha) {
                                window.grecaptcha.reset();
                            }
                            util.displayMessage(result);
                        } else if (result.error) {
                            $.spinner().stop();
                            if (window.grecaptcha) {
                                window.grecaptcha.reset();
                            }
                            util.displayMessage(result);
                        } else if (result.success) {
                            dataLayer.methods.formSubmitted();
                            location.href = result.redirectURL;// Redirecting to HearingTest confirmation page on success lead creation
                            $('.hearingtest-result').trigger('reset');
                        }
                    },
                    error: function (err) {
                        $.spinner().stop();
                        if (err.responseJSON.redirectUrl) {
                            window.location.href = err.responseJSON.redirectUrl;
                        }
                    }
                });
            } else {
                util.clearFileUploadLabels();
                $('.hearing-test-upload-file').find('.upload-file-error').text('<span class="file-upload-error" style="color:red; font-size:16px;">' + fileFormatErrorMsg + '</span>');
            }
            return true;
        });
    }
};

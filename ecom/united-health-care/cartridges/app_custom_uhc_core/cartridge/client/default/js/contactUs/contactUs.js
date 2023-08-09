'use strict';

/**
 * Display the returned message.
 * @param {string} data - data returned from the server's ajax call
 * @param {Object} button - button that was clicked for contact us sign-up
 */
function displayMessage(data, button) {
    $.spinner().stop();
    var status;
    if (data.success) {
        status = 'alert-success';
    } else {
        status = 'alert-danger';
    }

    if ($('.contact-us-signup-message').length === 0) {
        $('body').append(
            '<div class="contact-us-signup-message"></div>'
        );
    }
    $('.contact-us-signup-message')
        .append('<div class="contact-us-signup-alert text-center ' + status + '" role="alert">' + data.msg + '</div>');

    setTimeout(function () {
        $('.contact-us-signup-message').remove();
        button.removeAttr('disabled');
    }, 3000);
}

module.exports = {
    subscribeContact: function () {
        $('form.contact-us').submit(function (e) {
            e.preventDefault();
            var recaptchaEnable = $(this).data('recaptchaenable');
            if (recaptchaEnable) {
                $('#g-recaptcha-error').html('');
                var response = window.grecaptcha.getResponse();
                if (response.length === 0) {
                    // reCaptcha not verified
                    $('#g-recaptcha-error').html('<span style="color:red;">Please Verify Captcha</span>');
                    return false;
                }
            }

            var form = $(this);
            var button = $('.subscribe-contact-us');
            var url = form.attr('action');

            $.spinner().start();
            button.attr('disabled', true);
            $.ajax({
                url: url,
                type: 'post',
                dataType: 'json',
                data: form.serialize(),
                success: function (data) {
                    if (data.error && data.captchaError) {
                        $.spinner().stop();
                        window.grecaptcha.reset();
                        $('#g-recaptcha-error').append('<span style="color:red;">Please Verify Captcha</span>');
                    } else if (data.error) {
                        window.grecaptcha.reset();
                        displayMessage(data, button);
                    } else if (data.success) {
                        var redirect = $('<form>')
                        .appendTo(document.body)
                        .attr({
                            method: 'POST',
                            action: data.redirectUrl
                        });
                        redirect.submit();
                        $('.contact-us').trigger('reset');
                    }
                },
                error: function (err) {
                    if (err.responseJSON.redirectUrl) {
                        window.location.href = err.responseJSON.redirectUrl;
                    }
                }
            });
            return true;
        });
    }
};

'use strict';

/**
 * initializes Iframe Update
 */
function frameUpdate() {
    var visibleDiv = $('div.questionID').not(':hidden').prop('id');
    var nameattr = 'question_' + visibleDiv;
    $('#' + visibleDiv).find('.ls-input-wrapper input').click(function () {
        if ($('#' + visibleDiv).find('.ls-input-wrapper input:checked').length > 0) {
            $('#' + visibleDiv).find('.ls-next').removeClass('disabled');
        } else {
            $('#' + visibleDiv).find('.ls-next').addClass('disabled');
        }
    });
    $('#' + visibleDiv).find('.ls-btn-wrapper .btn').click(function () {
        var selectedRadio = $('input[type=radio][name="' + nameattr + '"]:checked');
        var selectedVal = selectedRadio.val();
        $('#' + visibleDiv).attr('answer', selectedVal);
        if (!selectedVal) {
            var selectedcheckbox = '';
            $('input[type=checkbox][name="' + nameattr + '"]').each(function () {
                selectedcheckbox += $(this).is(':checked') + '|';
            });
            $('#' + visibleDiv).attr('answer', selectedcheckbox.slice(0, -1));
        }
        var actionID = $(this).attr('data-action');
        if ($(this).attr('data-action') === 'Finish') {
            var array = [];
            $('.questionID').each(function () {
                var json = {};
                json.question = $(this).attr('id');
                json.answer = $(this).attr('answer');
                array.push(json);
            });
            var requestObj = JSON.stringify(array);
            $.ajax({
                url: $('.life-style-questions-form').attr('data-url') + '?requestObj=' + requestObj,
                method: 'POST',
                success: function (data) {
                    if (data.methodType === 'get') {
                        var redirect = $('<form>')
                        .appendTo(document.body)
                        .attr({
                            method: 'POST',
                            action: data.redirectUrl
                        });
                        if (data.csrfToken) {
                            $('<input>')
                            .appendTo(redirect)
                            .attr({
                                name: 'csrf_token',
                                value: data.csrfToken
                            });
                        }
                        redirect.submit();
                    } else {
                        location.href = data.redirectUrl;
                    }
                }
            });
        } else {
            $('#' + visibleDiv).addClass('d-none');
            $('#' + actionID).removeClass('d-none');
            frameUpdate();
        }
    });
}

module.exports = {
    init: function () {
        frameUpdate();
    }
};

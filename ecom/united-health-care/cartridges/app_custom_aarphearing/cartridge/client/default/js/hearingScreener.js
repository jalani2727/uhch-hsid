
var current_fs, next_fs, previous_fs; //fieldsets
var left, opacity, scale; //fieldset properties being animated
var animating; //flag to prevent quick multi-click glitches

const fieldsets = $('.screener-form-container fieldset');
const progressBar = $('.hearing-screener-progress-bar');

function updateProgressBar(currentField, upcoming) {
    // Grab data-attribute from expected fieldset and apply it as a class name to the progressBar
    if (progressBar.hasClass(currentField.get(0).dataset.questionStart)) {
        progressBar.removeClass(currentField.get(0).dataset.questionStart);
        progressBar.addClass(upcoming.get(0).dataset.questionStart);
    };
    if (progressBar.hasClass(currentField.get(0).dataset.questionFilled)) {
        progressBar.removeClass(currentField.get(0).dataset.questionFilled);
        progressBar.addClass(upcoming.get(0).dataset.questionStart);
    };

};

// Change current Progress Bar step when a radio button or checkbox is selected.
fieldsets.each(function(index, fs) {
    let fieldset = $(this);

    fieldset.find(':input').click(function() {
        progressBar.hasClass(fieldset.get(0).dataset.questionFilled) ? '' : progressBar.addClass(fieldset.get(0).dataset.questionFilled);
    });
})

$(".next").click(function () {
    if (animating) return false;
    animating = true;

    current_fs = $(this).parent();
    next_fs = $(this).parent().next();

    // Logic to update Progress Bar Classes
    updateProgressBar(current_fs, next_fs);
    // Hide current fieldset
    current_fs.hide();

    // Update CSS on current fieldset
    current_fs.animate({
        opacity: 0
    }, {
        step: function (now, mx) {
            //as the opacity of current_fs reduces to 0 - stored in "now"
            //1. scale current_fs down to 80%
            scale = 1.2 - (1 - now) * 0.2;
            //2. bring next_fs from the right(50%)
            left = (now * 50) + "%";
            //3. increase opacity of next_fs to 1 as it moves in
            opacity = 1 - now;
            current_fs.css({
                'transform': 'scale(' + scale + ')',
            });
            next_fs.css({
                'transform': 'scale(' + scale + ')',
                'opacity': opacity
            });
            //show the next fieldset
            next_fs.show();
        },
        duration: 600,
        complete: function () {
            animating = false;
        },
    });
});

$(".previous").click(function () {
    if (animating) return false;
    animating = true;

    current_fs = $(this).parent();
    previous_fs = $(this).parent().prev();

    updateProgressBar(current_fs, previous_fs);

    // Clear the inputs of the current and previous fieldsets when going backwards
    // previous_fs.find(':input').prop('checked', false);
    // current_fs.find(':input').prop('checked', false);

    //show the previous fieldset
    previous_fs.show();

    //hide the current fieldset
    current_fs.animate({
        opacity: 0
    }, {
        step: function (now, mx) {
            //as the opacity of current_fs reduces to 0 - stored in "now"
            //1. scale previous_fs from 80% to 100%
            scale = 0.8 + (1 - now) * 0.2;
            //2. take current_fs to the right(50%) - from 0%
            left = ((1 - now) * 50) + "%";
            //3. increase opacity of previous_fs to 1 as it moves in
            opacity = 1 - now;
            current_fs.css({
                // 'left': left
            });
            previous_fs.css({
                'transform': 'scale(' + scale + ')',
                'position': 'relative',
                'opacity': opacity
            });
            current_fs.hide();
        },
        duration: 800,
        complete: function () {
            animating = false;
        },
    });
});

$(".submit").click(function () {
    return false;
})


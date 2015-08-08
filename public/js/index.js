//keeps the cover page the entire vertical width of the window. Using because iOS and Safari don't like vh
$(window).on('resize', function () {
    var windowHeight = $(window).height();
    $('#pageContent').css({
        'height': windowHeight
    });

});

$(document).ready(function () {
    var windowHeight = $(window).height();
    $('#pageContent').css({
        'height': windowHeight
    });

});


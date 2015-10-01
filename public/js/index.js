/**
 * Created by Jordan on 9/22/15.
 */
//keeps the cover page the entire vertical width of the window. Using because iOS and Safari don't like vh
$(window).on('resize', function () {

    var windowheight = $(window).height();

    $('#pagecontent').css({
        'height': windowheight
    });

});


$(document).ready(function () {


    var windowheight = $(window).height();

    $('#pagecontent').css({
        'height': windowheight
    });

});
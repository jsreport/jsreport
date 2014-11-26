/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

(function ($) {
    $.fn.errorAlert = function (options) {
        if (options === "close") {
            return this.alert('close');
        }

        var errorHtml = $.render["error-alert"](options.message);
        this.prepend(errorHtml);
    };

    $.extend({
        errorAlert: $.fn.errorAlert
    });
})(jQuery);
/*!
 * Copyright(c) 2014 Jan Blaha 
 */
/* globals _ */

(function ($) {
    $.fn.dialog = function (options) {
        var dialogSelector = options.error ? "#errorDialog" : "#standardDialog";
        if (!_.isObject(options)) {
            var method = options;
            switch (method) {
                case "hide":
                    $(dialogSelector + " #modalDialog").find(".close").trigger("click");
            }
        }

        $(dialogSelector + " #modalDialog").modal();
        $(dialogSelector + " #dialogStorno").show();

        $(dialogSelector + " #dialogHeader").html(options.header);
        $(dialogSelector + " #dialogContent").html(options.content);
        
        $(dialogSelector + " #dialogSubmit").unbind("click").click(function () {
            if (options.onSubmit != null)
                options.onSubmit();

            $(dialogSelector + " #modalDialog").modal('hide');
        });

        $(dialogSelector + " #dialogStorno").unbind("click").click(function () {
            if (options.onStorno != null)
                options.onStorno();

            $(dialogSelector + " #modalDialog").modal('hide');
        });

        if (options.hideButtons) {
            $(dialogSelector + " #dialogButtons").hide();
        } else {
            $(dialogSelector + " #dialogButtons").show();
        }


        if (options.hideSubmit) {
            $(dialogSelector + " #dialogSubmit").hide();
        } else {
            $(dialogSelector + " #dialogSubmit").show();
        }


        return $(dialogSelector + " #modalDialog");
    };

    $.extend({
        dialog: $.fn.dialog
    });
})(jQuery);
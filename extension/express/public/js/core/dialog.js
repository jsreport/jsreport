(function ($) {
    $.fn.dialog = function (options) {
        if (!_.isObject(options)) {
            var method = options;
            switch (method) {
                case "hide":
                    $("#standardDialog #modalDialog").find(".close").trigger("click");
            }
        }

        $("#standardDialog #modalDialog").modal();
        $("#standardDialog #dialogStorno").show();

        $("#standardDialog #dialogHeader").html(options.header);
        $("#standardDialog #dialogContent").html(options.content);

        if (options.error) {
            $("#standardDialog #dialogStorno").hide();
        }

        $("#standardDialog #dialogSubmit").unbind("click").click(function () {
            if (options.onSubmit != null)
                options.onSubmit();

            $("#standardDialog #modalDialog").modal('hide');
        });

        if (options.hideButtons == true) {
            $("#standardDialog #dialogButtons").html("");
        }

        if (options.hideSubmit == true) {
            $("#standardDialog #dialogSubmit").hide();
        }
    };

    $.extend({
        dialog: $.fn.dialog,
    });
})(jQuery);
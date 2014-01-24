define(["marionette", "jquery", "underscore", "core/utils"], function (Marionette, $, _, Utils) {
    var protoSlice = Array.prototype.slice;
    function slice(args) {
        return protoSlice.call(args);
    }

    return Marionette.Layout.extend({
        constructor: function () {
            var self = this;
            Marionette.Layout.prototype.constructor.apply(this, slice(arguments));
            _.bindAll(this, "validate", "onValidate");
            
            this.listenTo(this, "render", function() {
                Utils.liveDropdowns(self);
            });
            this.listenTo(this, "show", function() {
                Utils.liveDropdowns(self);
            });
        },

        serializeData: function () {
            var data = Marionette.ItemView.prototype.serializeData.call(this);
            $.extend(this, data);
            return this;
        },
        
        validate: function () {
            var self = this;
            $(".alert-danger").errorAlert("close");

            var res = true;
            _.each(this.onValidate(), function (e) {
                var el = e.el || self.$el;
                el.errorAlert({
                    message: e.message
                });
                res = false;
            });

            return res;
        },
        
        onValidate: function() {
            return [];
        },
    });
});
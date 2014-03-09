/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "marionette", "jquery", "underscore", "core/utils"], function(app, Marionette, $, _, Utils) {
    var protoSlice = Array.prototype.slice;

    function slice(args) {
        return protoSlice.call(args);
    }

    return Marionette.Layout.extend({
        constructor: function() {
            var self = this;
            Marionette.Layout.prototype.constructor.apply(this, slice(arguments));
            _.bindAll(this, "validate", "onValidate");

            this.listenTo(this, "render", function() {
                Utils.liveDropdowns(self);
            });
            this.listenTo(this, "show", function() {
                Utils.liveDropdowns(self);
            });

            this.modelBinder = new Backbone.ModelBinder();
        },

        serializeData: function() {
            var data = Marionette.ItemView.prototype.serializeData.call(this);

            $.extend(this, data);
            return this;
        },

        validate: function() {
            var self = this;

            var res = true;

            var messages = "";
            _.each(this.onValidate(), function(e) {
                messages += e.message + "\n";
                res = false;
            });

            if (!res)
                app.trigger("validation", messages);

            return res;
        },

        onValidate: function() {
            return [];
        },
    });
});
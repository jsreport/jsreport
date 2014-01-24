define(["backbone", "jquery"], function (Backbone, $) {
    return Backbone.Model.extend({
        idAttribute: "_id",
        syncProvider: "jQuery",
        
        toString: function () {
            return "";
        }
    });
});



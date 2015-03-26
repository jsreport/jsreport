/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["backbone", "jquery"], function (Backbone, $) {
    return Backbone.Model.extend({
        idAttribute: "_id",
        syncProvider: "jQuery",
        isModel: true,

        hasChangesSyncLastSync: function() {
            return this.lastChangedDate > this.lastSyncDate;
        },

        initialize: function() {
            var self = this;
            this.listenTo(this, "sync", function() {
                self.lastSyncDate = new Date();
            });
            this.listenTo(this, "change", function() {
                self.lastChangedDate = new Date();
            });
        },

        toJSON: function () {
            var self = this;
            var json = Backbone.Model.prototype.toJSON.call(this);

            $.each(json, function (name, value) {
                if (value != null && value.isModel)
                    json[name] = value.toJSON();
            });

            return json;
        },
        
        toString: function () {
            return "";
        }
    });
});



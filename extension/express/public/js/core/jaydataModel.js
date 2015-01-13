/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["backbone", "jquery", "app"], function (Backbone, $, app) {
    return Backbone.Model.extend({
        idAttribute: "_id",
        provider: "jaydata",
        
        initialize: function() {
            if (this._initialize)
                this._initialize();
            
            this.originalEntity = new this.Entity();

            var self = this;
            this.listenTo(this, "sync", function() {
                self.lastSyncDate = new Date();
            });
            this.listenTo(this, "change", function() {
                self.lastChangedDate = new Date();
            });
        },
        
        toString: function() {
            return "";
        },
        
        hasChangesSyncLastSync: function() {
            return this.lastChangedDate > this.lastSyncDate;
        },

        toJSON: function () {
            var self = this;
            var json = Backbone.Model.prototype.toJSON.call(this);

            $.each(json, function (name, value) {
                if (value != null && value.initData)
                    json[name] = value.toJSON();
            });

            return json;
        },
        
        copyToEntity: function () {
            
            function copyAttributes(e, m) {
                for (var p in m.attributes) {
                    var attr = m.attributes[p];

                    if (attr != null) {
                        if (attr.attributes != null) {
                            if (e[p] == null)
                                e[p] = new attr.Entity();

                            copyAttributes(e[p], attr);
                        } else {
                            e[p] = attr;
                        }
                    }
                }
            }

            if (this.originalEntity == null)
                this.originalEntity = new (this.Entity)();
            
            copyAttributes(this.originalEntity, this);
        }
    });
});


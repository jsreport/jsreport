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
        },
        
        toString: function() {
            return "";
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


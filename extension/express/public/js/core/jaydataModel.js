define(["backbone", "jquery", "app"], function (Backbone, $, app) {
    return Backbone.Model.extend({
        idAttribute: "_id",
        provider: "jaydata",
        
        initialize: function() {
           // this.listenTo(this, "change", this.copyToEntity);
            
            if (this._initialize)
                this._initialize();
            
            this.originalEntity = new this.Entity();
            
            //for (var f in this.originalEntity.getType().getFieldNames()) {
            //    var model = app.modelManager.get(this.originalEntity.getType().getMemberDefinition(f).originalType);
            //}
        },

        parse: function (data) {
            //for (var p in data) {
            //    var attr = data[p];
                
            //    if (attr != null) {
            //        var e = this.originalEntity;
            //    }
            //}
            
            return data;
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


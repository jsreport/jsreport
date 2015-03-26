define(["app", "backbone", "core/basicModel"], function (app, Backbone, ModelBase) {

    var ItemModel = Backbone.Model.extend({
    });

    var CollectionModel = Backbone.Collection.extend({
        url: function() {
            var now = new Date();
            now.setDate(now.getDate() - 7);
            return "odata/statistics?$filter=fiveMinuteDate gt datetime'" + now.toISOString().replace("Z", "") + "'";
        },

        model: ItemModel
    });

    return ModelBase.extend({
       initialize: function() {
           this.items = new CollectionModel();
           this.set("filter", "Last hour");
           var self = this;
           this.listenTo(this.items, "sync", function() { self.trigger("sync"); });
       },

       fetch: function(options) {
         this.items.fetch(options);
       }
    });

});
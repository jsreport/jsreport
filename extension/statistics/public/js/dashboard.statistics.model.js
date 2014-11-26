define(["app", "backbone", "core/jaydataModel", "core/basicModel"], function (app, Backbone, JayDataModelBase, ModelBase) {

    var ItemModel = JayDataModelBase.extend({
        _initialize: function () {
            this.Entity = $entity.Statistic;
        }
    });

    var CollectionModel = Backbone.Collection.extend({
        contextSet: function () { return app.dataContext.statistics; },
        fetchQuery: function () {
            var now = new Date();
            now.setDate(now.getDate() - 7);
            return this.contextSet().filter(function (s) {
                return s.fiveMinuteDate >= this.day;
            }, { day: now }).toArray();
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
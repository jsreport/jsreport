define(["app", "backbone", "core/jaydataModel"], function (app, Backbone, ModelBase) {

    var ItemModel = ModelBase.extend({
        _initialize: function () {
            this.Entity = $entity.Statistic;
        },
    });

    return Backbone.Collection.extend({
        contextSet: function () { return app.dataContext.statistics; },
        fetchQuery: function () {
            var now = new Date();
            now.setDate(now.getDate() - 20);
            return this.contextSet().filter(function (s) {
                return s.day > this.day;
            }, { day: now }).toArray();
        },

        model: ItemModel,
    });

});
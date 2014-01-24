define(["marionette", "underscore", "jquery"], function(Marionette, _, $) {
    return Marionette.ItemView.extend({
        template: "dashboard-statistics",

        initialize: function () {
            this.listenTo(this.collection, "sync", this.render);
        },

        onDomRefresh: function () {
            var plot = _.chain(this.collection.toJSON())
                .groupBy(function (s) { return s.templateShortid; })
                .map(function (g) {
                    return {
                        data: _.map(g, function (s) { return [s.day.getTime(), s.amount]; }),
                        points: { show: true }
                    };
                })
                .value();

            if (plot.length == 0)
                return;

            var maxDay = new Date();
            var minDay = new Date();
            minDay.setDate(maxDay.getDate() - 20);

            $.plot("#chartBox", plot, {
                xaxis:
                {
                    mode: "time",
                    timeformat: "%d.%m",
                    minTickSize: [1, "day"],
                    min: minDay.getTime(),
                    max: maxDay.getTime()
                },
                yaxis:
               {
                   tickDecimals: 0,
                   min: 0
               }
            });
        }
    });
});



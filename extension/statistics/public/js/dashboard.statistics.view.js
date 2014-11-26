define(["marionette", "underscore", "jquery", "core/view.base"], function(Marionette, _, $, ViewBase) {
    return ViewBase.extend({
        template: "dashboard-statistics",

        initialize: function() {
            this.listenTo(this.model, "sync", this.render);
            this.listenTo(this.model, "change:filter", this.render);
        },

        onDomRefresh: function() {
            var data = this.model.items.toJSON();

            if (data.length === 0)
                return;

            var now = new Date();
            var min = new Date();

            var timeformat;
            var minTickSize;

            var minutesToRound = 5;

            if (this.model.get("filter") === "Last hour") {
                min.setTime(now.getTime() + (-1 * 60 * 60 * 1000));
                timeformat = "%h:%M";
                minTickSize = [5, "minute"];

                minutesToRound = 5;
            }

            if (this.model.get("filter") === "Last 24 hours") {
                min.setTime(now.getTime() + (-24 * 60 * 60 * 1000));
                timeformat = "%h:%M";
                minTickSize = [1, "hour"];

                minutesToRound = 60;
            }

            if (this.model.get("filter") === "Last 7 days") {
                min.setTime(now.getTime() + (-7 * 24 * 60 * 60 * 1000));
                timeformat = "%m/%d";
                minTickSize = [12, "hour"];

                minutesToRound = 60 * 24;
            }

            var associativeData = {};
            for (var i = 0; i < data.length; i++) {
                associativeData[data[i].fiveMinuteDate.getTime()] = {
                    amount: data[i].amount,
                    failures: data[i].amount - data[i].success
                };
            }

            var roundedMin = new Date((Math.floor(min.getTime() / 1000 / 60 / minutesToRound) * 1000 * 60 * minutesToRound));

            var successData = [];
            var failureData = [];

            for (var h = roundedMin.getTime(); h < now.getTime(); h += 1000 * 60 * minutesToRound) {
                var currentAmount = 0;
                var currentFailures = 0;
                for (var m = h; m < h + (1000 * 60 * minutesToRound); m += 1000 * 60 * 5) {
                    currentAmount += (associativeData[m] == null) ? 0 : associativeData[m].amount;
                    currentFailures += (associativeData[m] == null) ? 0 : associativeData[m].failures;
                }

                successData.push([h, currentAmount]);
                failureData.push([h, currentFailures]);
            }


            var plot = [{
                    label: "Attempts",
                    data: successData,
                    color: "#0062E3",
                    points: { fillColor: "#0062E3", show: true },
                    lines: { show: true }
                }, {
                    label: "Failures",
                    data: failureData,
                    color: "#FF0000",
                    points: { fillColor: "#FF0000", show: true },
                    lines: { show: true }
                }];

            $.plot("#chartBox", plot, {
                series: {
                    shadowSize: 5
                },
                xaxis:
                {
                    timezone: "browser",
                    mode: "time",
                    timeformat: timeformat,
                    minTickSize: minTickSize,
                    axisLabelUseCanvas: true,
                    min: min.getTime(),
                    max: now.getTime()
                },
                yaxis:
                {
                    color: "black",
                    tickDecimals: 0,
                    min: 0,
                    axisLabel: "Generated reports",
                    axisLabelUseCanvas: true,
                    axisLabelPadding: 5
                },
                legend: {
                    noColumns: 0,
                    labelFormatter: function(label, series) {
                        return "<font color=\"black\">" + label + "</font>";
                    },
                    backgroundColor: "#DDDDDD",
                    backgroundOpacity: 0.8,
                    position: "nw"
                },
                grid: {
                    hoverable: true,
                    borderWidth: 3,
                    mouseActiveRadius: 50,
                    backgroundColor: { colors: ["#ffffff", "#EDF5FF"] },
                    axisMargin: 20
                }
            });

            var previousPoint = null, previousLabel = null;

            function padStr(i) {
                return (i < 10) ? "0" + i : "" + i;
            }

            //http://www.jqueryflottutorial.com/how-to-make-jquery-flot-time-series-chart.html
            $.fn.UseTooltip = function() {
                $(this).bind("plothover", function(event, pos, item) {
                    if (item) {
                        if ((previousLabel !== item.series.label) || (previousPoint !== item.dataIndex)) {
                            previousPoint = item.dataIndex;
                            previousLabel = item.series.label;
                            $("#tooltip").remove();

                            var x = item.datapoint[0];
                            var y = item.datapoint[1];
                            var date = new Date(x);
                            var dateStart = new Date(date.getTime() - 1000 * 60 * minutesToRound);
                            var color = item.series.color;

                            var month = date.getUTCMonth();
                            var day = date.getUTCDate();
                            var year = date.getUTCFullYear();

                            showTooltip(item.pageX, item.pageY, color,
                                     year + "/" + month + "/" + day + " " +
                                    padStr(dateStart.getHours()) + ":" + padStr(dateStart.getMinutes()) + " - " +
                                    padStr(date.getHours()) + ":" + padStr(date.getMinutes()) +
                                    "<div style='text-align:center'><strong>" + item.series.label + ": " +  y + "</strong></div>");
                        }
                    } else {
                        $("#tooltip").remove();
                        previousPoint = null;
                    }
                });
            };

            function showTooltip(x, y, color, contents) {
                $('<div id="tooltip">' + contents + '</div>').css({
                    position: 'absolute',
                    display: 'none',
                    top: y - 60,
                    left: x - 120,
                    border: '2px solid ' + color,
                    padding: '3px',
                    'font-size': '9px',
                    'border-radius': '5px',
                    'background-color': '#fff',
                    'font-family': 'Verdana, Arial, Helvetica, Tahoma, sans-serif',
                    opacity: 0.9
                }).appendTo("body").fadeIn(200);
            }

            $("#chartBox").UseTooltip();
        }
    });
});
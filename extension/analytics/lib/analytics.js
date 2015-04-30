/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Anonymous usage analytics to help improve jsreport
 */

var ua = require('universal-analytics'),
    hostname = require("os").hostname(),
    crypto = require("crypto"),
    md5 = crypto.createHash("md5");

function initializeAnalytics(reporter, definition) {
    var hash = md5.update(hostname).digest("hex");
    var visitor = ua(definition.options.gaId || 'UA-49012894-5', hash, {strictCidFormat: false});
    visitor.event("General", "Instance Activated").send();

    var statistics = { recipes: {}};

    reporter.beforeRenderListeners.add("analytics", function(req) {
        statistics.recipes[req.template.recipe] = statistics.recipes[req.template.recipe] || 0;
        statistics.recipes[req.template.recipe]++;
    });

    setInterval(function() {
        var recipes = statistics.recipes;
        statistics = { recipes: {}};

        for (var rec in recipes) {
            visitor.event("Rendering", rec, rec, recipes[rec]).send();
        }
    }, 60000);
}

module.exports = function (reporter, definition) {

    var analyticsSettings = reporter.settings.get("analytics");

    if (!analyticsSettings) {
        reporter.initializeListener.add("analytics", function () {
            reporter.documentStore.collection("settings").beforeInsertListeners.add("analytics", function (doc) {
                if (doc.key === "analytics" && doc.value === "ok") {
                    initializeAnalytics(reporter, definition);
                }
            });
        });
        return;
    }

    if (analyticsSettings.value === "ok") {
        initializeAnalytics(reporter, definition);
        return;
    }
};
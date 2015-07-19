/*! 
 * Copyright(c) 2015 Jan Blaha
 *
 */

var FS = require("q-io/fs"),
    path = require("path");

module.exports = function (reporter, definition) {
    return;

    //just checking the presence of license key... later we may verify it against the jsreport.net service
    reporter.initializeListener.add("licensing", function () {
        return FS.exists(path.join(reporter.options.rootDirectory, "license-key.txt")).then(function(rootExist) {
            return FS.exists(path.join(reporter.options.dataDirectory, "license-key.txt")).then(function(dataExist) {
                if (rootExist || dataExist) {
                    reporter.logger.info("License found, using enterprise");
                    return reporter.settings.addOrSet("license", true);
                }

                reporter.logger.warn("License not found, using free");
                return reporter.settings.addOrSet("license", false);
            });
        }).fail(function(e) {
            reporter.logger.error(e);
        });
    });
};
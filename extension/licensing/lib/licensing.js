/*! 
 * Copyright(c) 2015 Jan Blaha
 *
 */

var FS = require("q-io/fs"),
    path = require("path");

module.exports = function (reporter, definition) {

    //just checking the presence of license key... later we may verify it against the jsreport.net service
    reporter.initializeListener.add("licensing", function () {
        return FS.read(path.join(reporter.options.rootDirectory, "license-key.txt")).then(function(license) {
            reporter.logger.info("License found, using enterprise");
            return reporter.settings.addOrSet("license", true);
        }).fail(function(e) {
            reporter.logger.warn("License not found, using free");
            return reporter.settings.addOrSet("license", false);
        });
    });
};
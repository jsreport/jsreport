/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Recipe allowing to print pdf from apache fop
 */ 

var childProcess = require('child_process'),
    shortid = require("shortid"),
    join = require("path").join,
    winston = require("winston"),
    fs = require("fs"),
    _ = require("underscore"),
    Q = require("q"),
    FS = require("q-io/fs");

var logger = winston.loggers.get('jsreport');


module.exports = Fop = function(reporter) {
    if (!fs.existsSync(join("reports-tmpl"))) {
        fs.mkdir(join("reports-tmpl"));
    }

    reporter.extensionsManager.recipes.push({
        name: "fop-pdf",

        execute: function(request, response) {
            logger.info("Rendering fop start.");

            var foFilePath = join("reports-tmpl", shortid.generate() + ".fo");
            var htmlRecipe = _.findWhere(reporter.extensionsManager.recipes, { name: "html" });

            return htmlRecipe.execute(request, response)
                .then(function() { return FS.write(foFilePath, response.result); })
                .then(function() { return FS.write(foFilePath, response.result); })
                .then(function() {
                    return Q.nfcall(function(cb) {
                        logger.info("Rastering pdf child process start.");

                        var childArgs = [
                            "-fo",
                            foFilePath,
                            "-pdf",
                            foFilePath.replace(".fo", ".pdf")
                        ];

                        childProcess.execFile("fop.bat", childArgs, function(error, stdout, stderr) {
                            logger.info("Rastering pdf child process end.");

                            if (error !== null) {
                                logger.error('exec error: ' + error);
                                return cb(error);
                            }

                            if (!fs.existsSync(childArgs[3])) {
                                return cb(stderr + stdout);
                            }


                            response.result = fs.createReadStream(childArgs[3]);
                            response.headers["Content-Type"] = "application/pdf";
                            response.headers["File-Extension"] = "pdf";
                            response.isStream = true;

                            logger.info("Rendering pdf end.");
                            return cb(null, response);
                        });
                    });
                });
        }
    });
};
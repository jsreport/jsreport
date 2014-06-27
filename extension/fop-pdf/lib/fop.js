/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Recipe allowing to print pdf from apache fop
 */ 

var childProcess = require('child_process'),
    shortid = require("shortid"),
    join = require("path").join,
    fs = require("fs"),
    _ = require("underscore"),
    Q = require("q"),
    FS = require("q-io/fs");

var Fop = module.exports = function(reporter) {
    if (!fs.existsSync(join(reporter.options.rootDirectory, "data", "temp"))) {
        fs.mkdir(join(reporter.options.rootDirectory, "data", "temp"));
    }

    reporter.extensionsManager.recipes.push({
        name: "fop-pdf",

        execute: function(request, response) {
            reporter.logger.info("Rendering fop start.");

            var foFilePath = join("data/temp", shortid.generate() + ".fo");
            var htmlRecipe = _.findWhere(reporter.extensionsManager.recipes, { name: "html" });

            return htmlRecipe.execute(request, response)
                .then(function() { return FS.write(foFilePath, response.result); })
                .then(function() { return FS.write(foFilePath, response.result); })
                .then(function() {
                    return Q.nfcall(function(cb) {
                        reporter.logger.info("Rastering pdf child process start.");

                        var childArgs = [
                            "-fo",
                            foFilePath,
                            "-pdf",
                            foFilePath.replace(".fo", ".pdf")
                        ];

                        childProcess.execFile("fop.bat", childArgs, function(error, stdout, stderr) {
                            reporter.logger.info("Rastering pdf child process end.");

                            if (error !== null) {
                                reporter.logger.error('exec error: ' + error);
                                error.weak = true;
                                return cb(error);
                            }

                            if (!fs.existsSync(childArgs[3])) {
                                return cb(stderr + stdout);
                            }


                            response.result = fs.createReadStream(childArgs[3]);
                            response.headers["Content-Type"] = "application/pdf";
                            response.headers["File-Extension"] = "pdf";
                            response.isStream = true;

                            reporter.logger.info("Rendering pdf end.");
                            return cb(null, response);
                        });
                    });
                });
        }
    });
};
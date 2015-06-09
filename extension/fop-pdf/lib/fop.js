/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Recipe allowing to print pdf from apache fop
 */

var childProcess = require('child_process'),
    shortid = require("shortid"),
    join = require("path").join,
    _ = require("underscore"),
    q = require("q"),
    FS = require("q-io/fs"),
    fs = require("fs");

var Fop = module.exports = function (reporter) {

    reporter.extensionsManager.recipes.push({
        name: "fop-pdf",

        execute: function (request, response) {
            reporter.logger.info("Rendering fop start.");

            var foFilePath = join(reporter.options.tempDirectory, shortid.generate() + ".fo");

            return FS.write(foFilePath, response.content).then(function () {
                return FS.write(foFilePath, response.content);
            }).then(function () {

                reporter.logger.info("Rastering pdf child process start.");

                var childArgs = [
                    "-fo",
                    foFilePath,
                    "-pdf",
                    foFilePath.replace(".fo", ".pdf")
                ];

                var isWin = /^win/.test(process.platform);
                var fopFile = "fop" + (isWin ? ".bat" : "");

                return q.nfcall(function(cb) {
                    childProcess.execFile(fopFile, childArgs, function (error, stdout, stderr) {
                        reporter.logger.info("Rastering pdf child process end.");

                        if (error !== null) {
                            reporter.logger.error('exec error: ' + error);
                            error.weak = true;
                            return cb(error);
                        }

                        if (!fs.existsSync(childArgs[3])) {
                            return cb(stderr + stdout);
                        }


                        response.headers["Content-Type"] = "application/pdf";
                        response.headers["File-Extension"] = "pdf";
                        response.headers["Content-Disposition"] = "inline; filename=\"report.pdf\"";

                        return fs.readFile(childArgs[3], function (err, buf) {
                            if (err) {
                                return cb(err);
                            }
                            response.content = buf;
                            cb();
                        });
                    });
                });
            });
        }
    });
};

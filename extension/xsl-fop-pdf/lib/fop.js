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

    ent = require("entities");

var Fop = module.exports = function (reporter) {

    reporter.extensionsManager.recipes.push({
        name: "xsl-fop-pdf",

        execute: function (request, response) {
            reporter.logger.info("Rendering fop start.");

            var xslFilePath = join(reporter.options.tempDirectory, shortid.generate() + ".xsl");
            var xmlFilePath = xslFilePath.replace(".xsl", ".xml");
            var pdfFilePath = xslFilePath.replace(".xsl", ".pdf");


            return FS.write(xslFilePath, response.content).then(function () {
                var inputXml = ent.decodeHTML(request.data.data);
                return FS.write(xmlFilePath, inputXml);
            }).then(function () {

                reporter.logger.info("Rastering pdf child process start.");

                var childArgs = [
                    "-xml",
                    xmlFilePath,
                    "-xsl",
                    xslFilePath,
                    "-pdf",
                    pdfFilePath
                ];

                var isWin = /^win/.test(process.platform);
                var fopFile = "fop" + (isWin ? ".bat" : "");

                return q.nfcall(function(cb) {
                    childProcess.execFile(fopFile, childArgs, {maxBuffer : 1024 * 1024 * 64}, function (error, stdout, stderr) {
                        reporter.logger.info("Rastering pdf child process end.");

                        if (error !== null) {
                            reporter.logger.error('exec error: ' + error);
                            error.weak = true;
                            return cb(error);
                        }

                        if (!fs.existsSync(childArgs[5])) {
                            return cb(stderr + stdout);
                        }


                        response.headers["Content-Type"] = "application/pdf";
                        response.headers["File-Extension"] = "pdf";
                        response.headers["Content-Disposition"] = "inline; filename=\"report.pdf\"";

                        return fs.readFile(childArgs[5], function (err, buf) {
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

var childProcess = require('child_process'),
    //phantomjs = require('phantomjs'),
    //binPath = phantomjs.path,
    fork = require('child_process').fork,
    shortid = require("shortid"),
    join = require("path").join,
    winston = require("winston"),
    fs = require("fs"),
    _ = require("underscore"),
    Q = require("q"),
    FS = require("q-io/fs");

var logger = winston.loggers.get('jsreport');

module.exports = Phantom = function(reporter, definition) {


    reporter.extensionsManager.recipes.push({
        name: "phantom",
        execute: function(request, response) {
            var deferred = Q.defer();
            logger.info("Rendering pdf start.");

            var htmlRecipe = _.findWhere(reporter.extensionsManager.recipes, { name: "html" });

            htmlRecipe.execute(request, response)
                .then(function() {
                    logger.info("Rastering pdf child process start.");
                    var generationId = shortid.generate();

                    var htmlFile = join(__dirname, "reports-tmpl", generationId + ".html");
                    FS.write(htmlFile, response.result).then(function() {
                        var childArgs = [
                            join(__dirname, 'convertToPdf.js'),
                            "file:///" + htmlFile,
                            join(__dirname, "reports-tmpl", generationId + ".pdf"),
                        ];

                        //binPath variable is having path to my local development phantom
                        //I will asume here that phantom is in the path variable, its anyway inside npm
                        //and npm is in path. We will si how this will work unde unix
                        childProcess.execFile("phantomjs.CMD", childArgs, function(error, stdout, stderr) {
                            logger.info("Rastering pdf child process end.");

                            //console.log(stdout);
                            //console.log(stderr);
                            //console.log(error);

                            if (error !== null) {
                                logger.error('exec error: ' + error);
                                return deferred.reject(error);
                            }

                            response.result = fs.createReadStream(childArgs[2]);
                            response.contentType = "application/pdf";
                            response.fileExtension = "pdf";
                            response.isStream = true;

                            logger.info("Rendering pdf end.");
                            return deferred.resolve();
                        });
                    });
                });

            return deferred.promise;
        }
    });
};
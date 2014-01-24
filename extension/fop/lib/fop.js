var childProcess = require('child_process'),
    shortid = require("shortid"),
    join = require("path").join,
    winston = require("winston"),
    fs = require("fs"),
    _ = require("underscore"),
    Q = require("q"),
    FS = require("q-io/fs");

var logger = winston.loggers.get('jsreport');


module.exports = Fop = function(reporter, definition) {
    
    reporter.extensionsManager.recipes.push({
        name: "fop",
        
        execute: function(request, response) {
            var deferred = Q.defer();
            logger.info("Rendering fop start.");

            var foFilePath = join(__dirname, "reports-tmpl", shortid.generate() + ".fo");
            var htmlRecipe = _.findWhere(reporter.extensionsManager.recipes, { name: "html" });
                
            htmlRecipe.execute(request, response)
                .then(function() { return FS.write(foFilePath, response.result); })
                .then(function() { return FS.write(foFilePath, response.result); })
                .then(function() {
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
                            return deferred.reject(error);
                        }

                        if (!fs.existsSync(childArgs[3])) {
                            return deferred.reject(stderr + stdout);
                        }


                        response.result = fs.createReadStream(childArgs[3]);
                        response.contentType = "application/pdf";
                        response.fileExtension = "pdf";
                        response.isStream = true;

                        logger.info("Rendering pdf end.");
                        return deferred.resolve(response);
                    });
                });

            return deferred.promise;
        }
    });
};
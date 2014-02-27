/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

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
    FS = require("q-io/fs"),
    extend = require("node.extend");

var logger = winston.loggers.get('jsreport');

module.exports = Phantom = function(reporter, definition) {
    reporter[definition.name] = new Phantom(reporter, definition);
};

Phantom = function(reporter, definition) {
    this._addRecipe(reporter);
    this.reporter = reporter;

    this.PhantomType = $data.Class.define(reporter.extendGlobalTypeName("$entity.Phantom"), $data.Entity, null, {
        margin: { type: "string" },
        header: { type: "string" },
        headerHeight: { type: "string" },
        footer: { type: "string" },
        footerHeight: { type: "string" },
    }, null);

    reporter.templates.TemplateType.addMember("phantom", { type: this.PhantomType });

    var self = this;
    reporter.templates.TemplateType.addEventListener("beforeCreate", function(args, template) {
        template.phantom = template.phantom || new (self.PhantomType)();
    });
};

Phantom.prototype._processHeaderFooter = function(request, generationId, filePostfix, content) {
    if (content == null)
        return Q(null);

    var promise = Q.defer();

    var req = extend(true, {}, request);
    req.template = { content: content, recipe: "html" };

    this.reporter.render(req, function(err, resp) {
        var filePath = join(__dirname, "reports-tmpl", generationId + "-" + filePostfix + ".html");
        FS.write(filePath, resp.result).then(function() {
            promise.resolve(filePath);
        });
    });

    return promise.promise;
};

Phantom.prototype._addRecipe = function(reporter) {
    var self = this;
    reporter.extensionsManager.recipes.push({
        name: "phantom-pdf",
        execute: function(request, response) {

            request.template.phantom = request.template.phantom || new self.PhantomType();

            var deferred = Q.defer();
            logger.info("Rendering pdf start.");

            var htmlRecipe = _.findWhere(reporter.extensionsManager.recipes, { name: "html" });

            htmlRecipe.execute(request, response)
                .then(function() {
                    logger.info("Rastering pdf child process start.");
                    var generationId = shortid.generate();

                    var htmlFile = join(__dirname, "reports-tmpl", generationId + ".html");
                    FS.write(htmlFile, response.result).then(function() {
                        self._processHeaderFooter(request, generationId, "header", request.template.phantom.header).then(function(header) {
                             self._processHeaderFooter(request, generationId, "footer", request.template.phantom.footer).then(function(footer) {
                               
                                var childArgs = [
                                    join(__dirname, 'convertToPdf.js'),
                                    "file:///" + htmlFile,
                                    join(__dirname, "reports-tmpl", generationId + ".pdf"),
                                    request.template.phantom.margin || "null",
                                    header || "null",
                                    footer || "null",
                                    request.template.phantom.headerHeight || "null",
                                    request.template.phantom.footerHeight || "null"
                                ];

                                //binPath variable is having path to my local development phantom
                                //I will asume here that phantom is in the path variable, its anyway inside npm
                                //and npm is in path. We will si how this will work under unix
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
                                    response.headers["Content-Type"] = "application/pdf";
                                    response.headers["File-Extension"] = "pdf";
                                    response.isStream = true;

                                    logger.info("Rendering pdf end.");
                                    return deferred.resolve();
                                });
                            });
                        }, function(err) {
                            deferred.reject(err);
                        });
                    });
                }, function(err) {
                    deferred.reject(err);
                });
            
            return deferred.promise;
        }
    });

}
/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Recipe rendering pdf files using phantomjs.  
 */ 

var childProcess = require('child_process'),
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

    if (!fs.existsSync(join(__dirname, "reports-tmpl"))) {
        fs.mkdir(join(__dirname, "reports-tmpl"));
    }
};

Phantom = function(reporter, definition) {
    this.reporter = reporter;

    reporter.extensionsManager.recipes.push({
        name: "phantom-pdf",
        execute: Phantom.prototype.execute.bind(this)
    });

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

Phantom.prototype.execute = function(request, response) {
    var self = this;

    request.template.phantom = request.template.phantom || new self.PhantomType();
    
    var generationId = shortid.generate();
    var htmlFile = join(__dirname, "reports-tmpl", generationId + ".html");

    request.template.recipe = "html";
    return this.reporter.executeRecipe(request, response)
        .then(function() { return FS.write(htmlFile, response.result); })
        .then(function() { return self._processHeaderFooter(request, generationId, "header"); })
        .then(function() { return self._processHeaderFooter(request, generationId, "footer"); })
        .then(function() {

            return Q.nfcall(function(cb) {
                var childArgs = [
                    join(__dirname, 'convertToPdf.js'),
                    "file:///" + htmlFile,
                    join(__dirname, "reports-tmpl", generationId + ".pdf"),
                    request.template.phantom.margin || "null",
                    request.template.phantom.headerFile || "null",
                    request.template.phantom.footerFile || "null",
                    request.template.phantom.headerHeight || "null",
                    request.template.phantom.footerHeight || "null"
                ];

                var phantomPath = join(__dirname, "../../../", "node_modules", ".bin", "phantomjs.CMD");
                childProcess.execFile(phantomPath, childArgs, function(error, stdout, stderr) {
                    logger.info("Rastering pdf child process end.");

                    //console.log(stdout);
                    //console.log(stderr);
                    //console.log(error);

                    if (error !== null) {
                        logger.error('exec error: ' + error);
                        return cb(error);
                    }

                    response.result = fs.createReadStream(childArgs[2]);
                    response.headers["Content-Type"] = "application/pdf";
                    response.headers["File-Extension"] = "pdf";
                    response.isStream = true;

                    logger.info("Rendering pdf end.");
                    return cb();
                });
            });
        });
};

Phantom.prototype._processHeaderFooter = function(request, generationId, type) {
    if (request.template.phantom[type] == null)
        return Q(null);

    var req = extend(true, {}, request);
    req.template = { content: request.template.phantom[type], recipe: "html" };
    req.data = extend(true, {}, request.data);

    return this.reporter.render(req).then(function(resp) {
        var filePath = join(__dirname, "reports-tmpl", generationId + "-" + type + ".html");
        return FS.write(filePath, resp.result).then(function() {
            request.template.phantom[type + "File"] = filePath;
        });
    });
};
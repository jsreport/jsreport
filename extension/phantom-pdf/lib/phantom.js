/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Recipe rendering pdf files using phantomjs.  
 */

var childProcess = require('child_process'),
    uuid = require("uuid").v1,
    binPath = require('phantomjs').path,
    path = require("path"),
    join = path.join,
    fs = require("fs"),
    _ = require("underscore"),
    q = require("q"),
    FS = require("q-io/fs"),
    extend = require("node.extend"),
    PhantomManager = require("./phantomManager.js");


var phantomManager;

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Phantom(reporter, definition);

    if (!fs.existsSync(join(reporter.options.rootDirectory, "data", "temp"))) {
        fs.mkdir(join(reporter.options.rootDirectory, "data", "temp"));
    }

    //TODO extension initialization should rather return a function returning promise, now I cannot wait until script manager is started
    if (!phantomManager) {
        phantomManager = new PhantomManager(reporter.options.phantom);
        phantomManager.start();
    }
 };

var Phantom = function (reporter, definition) {
    this.reporter = reporter;

    reporter.extensionsManager.recipes.push({
        name: "phantom-pdf",
        execute: Phantom.prototype.execute.bind(this)
    });

    this.PhantomType = this.reporter.dataProvider.createEntityType("PhantomType", {
        margin: { type: "string" },
        header: { type: "string" },
        headerHeight: { type: "string" },
        footer: { type: "string" },
        footerHeight: { type: "string" },
        orientation: { type: "string" },
        format: { type: "string" },
        width: { type: "string" },
        height: { type: "string" }
    });

    reporter.templates.TemplateType.addMember("phantom", { type: this.PhantomType });

    var self = this;
    reporter.templates.TemplateType.addEventListener("beforeCreate", function (args, template) {
        template.phantom = template.phantom || new (self.PhantomType)();
    });
};

Phantom.prototype.execute = function (request, response) {
    var self = this;
    request.template.phantom = request.template.phantom || {};
    this.reporter.logger.debug("Pdf recipe start.");

    var phantomOptions = request.template.phantom || new self.PhantomType();
    phantomOptions = phantomOptions.initData || phantomOptions;

    var generationId = uuid();
    var htmlFile = join(request.reporter.options.rootDirectory, "data", "temp", generationId + ".html");
    var pdfFile = join(request.reporter.options.rootDirectory, "data", "temp", generationId + ".pdf");

    console.log(pdfFile);

    request.template.recipe = "html";
    return this.reporter.executeRecipe(request, response)
        .then(function () {
            return FS.write(htmlFile, response.result);
        })
        .then(function () {
            return self._processHeaderFooter(phantomOptions, request, generationId, "header");
        })
        .then(function () {
            return self._processHeaderFooter(phantomOptions, request, generationId, "footer");
        })
        .then(function () {
            return phantomManager.execute({
                url: phantomOptions.url || "file:///" + path.resolve(htmlFile),
                output: path.resolve(pdfFile),
                options: phantomOptions
            }).then(function () {
                response.result = fs.createReadStream(pdfFile);
                response.headers["Content-Type"] = "application/pdf";
                response.headers["Content-Disposition"] = "inline; filename=\"report.pdf\"";
                response.headers["File-Extension"] = "pdf";
                response.isStream = true;
                self.reporter.logger.debug("Rendering pdf end.");
            });
        });
};

Phantom.prototype._processHeaderFooter = function (phantomOptions, request, generationId, type) {
    if (!phantomOptions[type])
        return q(null);

    var req = extend(true, {}, request);
    req.template = { content: phantomOptions[type], recipe: "html" };
    req.data = extend(true, {}, request.data);
    req.options.saveResult = false;

    return this.reporter.render(req).then(function (resp) {
        var filePath = join(request.reporter.options.rootDirectory, "data", "temp", generationId + "-" + type + ".html");
        return FS.write(filePath, resp.result).then(function () {
            phantomOptions[type + "File"] = path.resolve(filePath);
        });
    });
};
/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Recipe rendering pdf files using phantomjs.  
 */

var uuid = require("uuid").v1,
    path = require("path"),
    join = path.join,
    fs = require("fs"),
    _ = require("underscore"),
    q = require("q"),
    FS = require("q-io/fs"),
    extend = require("node.extend"),
    mkdirp = require('mkdirp'),
    toArray = require('stream-to-array');

var conversion;

var Phantom = function (reporter, definition) {
    this.reporter = reporter;

    reporter.options.phantom = reporter.options.phantom || {};
    this.allowLocalFilesAccess = reporter.options.phantom.hasOwnProperty("allowLocalFilesAccess") ?
        reporter.options.phantom.allowLocalFilesAccess : false;

    reporter.extensionsManager.recipes.push({
        name: "phantom-pdf",
        execute: Phantom.prototype.execute.bind(this)
    });

    reporter.documentStore.registerComplexType("PhantomType", {
        margin: {type: "Edm.String"},
        header: {type: "Edm.String"},
        headerHeight: {type: "Edm.String"},
        footer: {type: "Edm.String"},
        footerHeight: {type: "Edm.String"},
        orientation: {type: "Edm.String"},
        format: {type: "Edm.String"},
        width: {type: "Edm.String"},
        height: {type: "Edm.String"},
        printDelay: {type: "Edm.Int32"},
        blockJavaScript: {type: "Edm.Boolean"}
    });

    reporter.documentStore.model.entityTypes["TemplateType"].phantom = {type: "jsreport.PhantomType"};
};

Phantom.prototype.execute = function (request, response) {
    var self = this;
    request.template.phantom = request.template.phantom || {};
    this.reporter.logger.debug("Pdf recipe start.");

    request.template.recipe = "html";
    var phantomOptions = request.template.phantom || {};

    return this.reporter.executeRecipe(request, response)
        .then(function () {
            return self._processHeaderFooter(phantomOptions, request, "header");
        })
        .then(function () {
            return self._processHeaderFooter(phantomOptions, request, "footer");
        })
        .then(function () {
            phantomOptions.paperSize = {
                width: phantomOptions.width,
                height: phantomOptions.height,
                headerHeight: phantomOptions.headerHeight,
                footerHeight: phantomOptions.footerHeight,
                format: phantomOptions.format,
                orientation: phantomOptions.orientation,
                margin: phantomOptions.margin
            };
            phantomOptions.allowLocalFilesAccess = self.allowLocalFilesAccess;
            phantomOptions.settings = {
                javascriptEnabled: phantomOptions.blockJavaScript !== 'true'
            };
            phantomOptions.html = response.result;

            return q.nfcall(conversion, phantomOptions);
        }).then(function (res) {
                request.options.isChildRequest = false;
                response.result = res.stream;
                response.headers["Content-Type"] = "application/pdf";
                response.headers["Content-Disposition"] = "inline; filename=\"report.pdf\"";
                response.headers["File-Extension"] = "pdf";
                response.headers["Number-Of-Pages"] = res.numberOfPages;
        }).then(function() {
            return q.nfcall(toArray, response.result).then(function (arr) {
                response.result = Buffer.concat(arr);
                self.reporter.logger.debug("Rendering pdf end.");
            });
        });
};

Phantom.prototype._processHeaderFooter = function (phantomOptions, request, type) {
    if (!phantomOptions[type])
        return q(null);

    var req = extend(true, {}, request);
    req.template = {content: phantomOptions[type], recipe: "html", helpers: request.template.helpers, engine: request.template.engine};
    req.data = extend(true, {}, request.data);
    req.options.isChildRequest = true;

    return this.reporter.render(req).then(function (resp) {
        return resp.result.toBuffer().then(function(buf) {
            phantomOptions[type] = buf.toString();
        });
    });
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Phantom(reporter, definition);

    if (!fs.existsSync(reporter.options.tempDirectory)) {
        mkdirp.sync(reporter.options.tempDirectory);
    }

    if (!conversion) {
        reporter.options.phantom.tmpDir = reporter.options.tempDirectory;
        conversion = require("phantom-html-to-pdf")(reporter.options.phantom);
    }
};

/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Recipe rendering pdf files using phantomjs.  
 */

var path = require("path"),
    q = require("q"),
    extend = require("node.extend");

var phantomToner;

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
        header: {type: "Edm.String", document: { extension: 'html', engine: true }},
        headerHeight: {type: "Edm.String"},
        footer: {type: "Edm.String", document: { extension: 'html', engine: true }},
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

    request.template.phantom.paperSize = {
        width: request.template.phantom.width,
        height: request.template.phantom.height,
        headerHeight: request.template.phantom.headerHeight,
        footerHeight: request.template.phantom.footerHeight,
        format: request.template.phantom.format,
        orientation: request.template.phantom.orientation,
        margin: request.template.phantom.margin
    };
    request.template.phantom.allowLocalFilesAccess = self.allowLocalFilesAccess;
    request.template.phantom.settings = {
        javascriptEnabled: request.template.phantom.blockJavaScript !== 'true'
    };

    return q.nfcall(phantomToner, request, response);
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Phantom(reporter, definition);

    if (!phantomToner) {
        reporter.options.phantom.tmpDir = reporter.options.tempDirectory;
        phantomToner = require("toner-phantom")(reporter.options.phantom);
    }
};

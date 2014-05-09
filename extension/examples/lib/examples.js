/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Examples extension is creating some sample report templates on the startup.
 */ 

var winston = require("winston"),
    util = require("util"),
    async = require("async"),
    _ = require("underscore"),
    join = require("path").join,
    fs = require("fs"),
    Q = require("q");


var logger = winston.loggers.get('jsreport');

module.exports = function(reporter, definition) {
    reporter[definition.name] = new Examples(reporter, definition);
};

Examples = function(reporter, definition) {
    var self = this;
    this.reporter = reporter;
    this.definition = definition;

    reporter.templates.TemplateType.addMember("isExample", { type: $data.Boolean });

    this.reporter.initializeListener.add(definition.name, this, function() {
        logger.info("Initializing examples.");

        return self.reporter.context.templates.filter(function(t) { return t.isExample == true; }).toArray()
            .then(function(res) {
                if (res.length > 0) {
                    logger.info("Examples are already present in the db.");
                    return Q();
                }

                return helloWorld().then(phantomPdf).then(fop).then(script).then(data).then(invoice).then(function() {
                    logger.info("Examples successfully created.");
                });
            });
    });

    function helloWorld() {
        return self.reporter.templates.create({
            name: "1. Hello World",
            content: fs.readFileSync(join(__dirname, 'examples/helloFib.html')).toString("utf8"),
            helpers: fs.readFileSync(join(__dirname, 'examples/helloFib.js')).toString("utf8"),
            engine: "jsrender",
            recipe: "html",
            isExample: true
        });
    }

    function phantomPdf() {
        return self.reporter.templates.create({
            name: "2. Hello World Phantom Pdf",
            content: fs.readFileSync(join(__dirname, 'examples/helloPhantom.html')).toString("utf8"),
            helpers: fs.readFileSync(join(__dirname, 'examples/helloFib.js')).toString("utf8"),
            engine: "jsrender",
            recipe: "phantom-pdf",
            isExample: true
        });
    }

    function fop() {
        return self.reporter.templates.create({
            name: "3. Hello World FOP Pdf",
            content: fs.readFileSync(join(__dirname, 'examples/helloWorld.xml')).toString("utf8"),
            helpers: fs.readFileSync(join(__dirname, 'examples/helloFib.js')).toString("utf8"),
            engine: "jsrender",
            recipe: "fop-pdf",
            isExample: true
        });
    }

    function script() {
        var templateObj = {
            name: "4. Scripts extension",
            content: fs.readFileSync(join(__dirname, 'examples/complexScript.html')).toString("utf8"),
            engine: "jsrender",
            recipe: "phantom-pdf",
            isExample: true,
            script: {            
                content: fs.readFileSync(join(__dirname, 'examples/complexScript.js')).toString("utf8")
            }
        };

        return self.reporter.templates.create(templateObj);
    }

    function data() {
        var templateObj = {
            name: "5. Inline Data extension",
            content: fs.readFileSync(join(__dirname, 'examples/inlineData.html')).toString("utf8"),
            engine: "jsrender",
            recipe: "html",
            isExample: true,
            dataItem: {               
                dataJson: fs.readFileSync(join(__dirname, 'examples/inlineData.js')).toString("utf8")
            }
        };

        return self.reporter.templates.create(templateObj);
    }

    function invoice() {
        var templateObj = {
            name: "6. Invoice",
            content: fs.readFileSync(join(__dirname, 'examples/invoice.html')).toString("utf8"),
            helpers: fs.readFileSync(join(__dirname, 'examples/invoiceHelpers.js')).toString("utf8"),
            engine: "jsrender",
            recipe: "html",
            isExample: true,
            dataItem: {              
                dataJson: fs.readFileSync(join(__dirname, 'examples/invoice.js')).toString("utf8")
            }
        };

        return self.reporter.templates.create(templateObj);
    }

    function library() {
        var templateObj = {
            name: "7. Library",
            content: fs.readFileSync(join(__dirname, 'examples/library.html')).toString("utf8"),
            helpers: fs.readFileSync(join(__dirname, 'examples/libraryHelpers.js')).toString("utf8"),
            engine: "handlebars",
            recipe: "phantom-pdf",
            isExample: true,
            dataItem: {                
                dataJson: fs.readFileSync(join(__dirname, 'examples/library.js')).toString("utf8")
            }
        };

        return self.reporter.templates.create(templateObj);
    }

    function complexReport() {
        var templateObj = {
            name: "8. Complex report",
            content: fs.readFileSync(join(__dirname, 'examples/complexReport.html')).toString("utf8"),            
            engine: "handlebars",
            recipe: "phantom-pdf",
            isExample: true,
            dataItem: {                
                dataJson: fs.readFileSync(join(__dirname, 'examples/complexReport.js')).toString("utf8")
            }
        };

        return self.reporter.templates.create(templateObj);
    }
};
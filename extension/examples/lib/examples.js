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
            html: fs.readFileSync(join(__dirname, 'examples/helloFib.html')).toString("utf8"),
            helpers: fs.readFileSync(join(__dirname, 'examples/helloFib.js')).toString("utf8"),
            engine: "jsrender",
            recipe: "html",
            isExample: true
        });
    }

    function phantomPdf() {
        return self.reporter.templates.create({
            name: "3. Hello World Phantom Pdf",
            html: fs.readFileSync(join(__dirname, 'examples/helloFib.html')).toString("utf8"),
            engine: "jsrender",
            recipe: "phantom",
            isExample: true
        });
    }

    function fop() {
        return self.reporter.templates.create({
            name: "4. Hello World FOP Pdf",
            html: fs.readFileSync(join(__dirname, 'examples/helloWorld.xml')).toString("utf8"),
            engine: "jsrender",
            recipe: "fop",
            isExample: true
        });
    }

    function script() {
        var scriptObj = {
             name: "Load BBC Animals",
             content: fs.readFileSync(join(__dirname, 'examples/complexScript.js')).toString("utf8")
        };

        var templateObj = {
            name: "5. Scripts extension",
            html: fs.readFileSync(join(__dirname, 'examples/complexScript.html')).toString("utf8"),
            engine: "jsrender",
            recipe: "phantom",
            isExample: true,
        };

        function finishTemplate() {
            if (!reporter.playgroundMode) {
                return reporter.scripts.create(scriptObj).then(function(scriptEntity) {
                    templateObj.scriptId = scriptEntity._id;
                    return Q(templateObj);
                });
            } else {
                templateObj.script = scriptObj;
                return Q(templateObj);
            }
        }


        return finishTemplate().then(function() {
            return self.reporter.templates.create(templateObj);
        });
    }

    function data() {
        var dataObj = {
             name: "BBC Animals",
             dataJson: fs.readFileSync(join(__dirname, 'examples/inlineData.js')).toString("utf8")
        };

        var templateObj = {
            name: "6. Inline Data extension",
            html: fs.readFileSync(join(__dirname, 'examples/inlineData.html')).toString("utf8"),
            engine: "jsrender",
            recipe: "html",
            isExample: true,
        };

        function finishTemplate() {
            if (!reporter.playgroundMode) {
                return reporter.data.create(dataObj).then(function(dataItemEntity) {
                    templateObj.dataItemId = dataItemEntity._id;
                    return Q(templateObj);
                });
            } else {
                templateObj.dataItem = dataObj;
                return Q(dataObj);
            }
        }


        return finishTemplate().then(function() {
            return self.reporter.templates.create(templateObj);
        });
    }
    
    function invoice() {
        var dataObj = {
             name: "Invoice",
             dataJson: fs.readFileSync(join(__dirname, 'examples/invoice.js')).toString("utf8")
        };

        var templateObj = {
            name: "8. Invoice",
            html: fs.readFileSync(join(__dirname, 'examples/invoice.html')).toString("utf8"),
            helpers: fs.readFileSync(join(__dirname, 'examples/invoiceHelpers.js')).toString("utf8"),
            engine: "jsrender",
            recipe: "html",
            isExample: true,
        };

        function finishTemplate() {
            if (!reporter.playgroundMode) {
                return reporter.data.create(dataObj).then(function(dataItemEntity) {
                    templateObj.dataItemId = dataItemEntity._id;
                    return Q(templateObj);
                });
            } else {
                templateObj.dataItem = dataObj;
                return Q(dataObj);
            }
        }


        return finishTemplate().then(function() {
            return self.reporter.templates.create(templateObj);
        });
    }
};
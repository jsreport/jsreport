/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Recipe rendering pdf files using phantomjs.  
 */ 

var childProcess = require('child_process'),
    fork = require('child_process').fork,
    shortid = require("shortid"),
    phantomjs = require('phantomjs'),
    binPath = phantomjs.path,
    path = require("path"),
    join = path.join,
    fs = require("fs"),
    _ = require("underscore"),
    q = require("q"),
    FS = require("q-io/fs"),
    extend = require("node.extend");

module.exports = function(reporter, definition) {
    reporter[definition.name] = new Phantom(reporter, definition);

    if (!fs.existsSync(join(reporter.options.rootDirectory, "data", "temp"))) {
        fs.mkdir(join(reporter.options.rootDirectory, "data", "temp"));
    }
};

var Phantom = function(reporter, definition) {
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
    reporter.templates.TemplateType.addEventListener("beforeCreate", function(args, template) {
        template.phantom = template.phantom || new (self.PhantomType)();
    });
};

Phantom.prototype.execute = function(request, response) {
    var self = this;
    this.reporter.logger.info("Pdf recipe start.");

    request.template.phantom = request.template.phantom || new self.PhantomType();
    
    var generationId = shortid.generate();
    var htmlFile = join("data/temp", generationId + ".html");

    request.template.recipe = "html";
    return this.reporter.executeRecipe(request, response)
        .then(function() { return FS.write(htmlFile, response.result); })
        .then(function() { return self._processHeaderFooter(request, generationId, "header"); })
        .then(function() { return self._processHeaderFooter(request, generationId, "footer"); })
        .then(function() {
            
            return q.nfcall(function(cb) {
                var childArgs = [	
		            '--ignore-ssl-errors=yes',
                    '--web-security=false',
                    join(__dirname, 'convertToPdf.js'),
                    request.template.phantom.url || ("file:///" + path.resolve(htmlFile)),
                    join("data/temp", generationId + ".pdf"),
                    request.template.phantom.margin || "null",
                    request.template.phantom.headerFile || "null",
                    request.template.phantom.footerFile || "null",
                    request.template.phantom.headerHeight || "null",
                    request.template.phantom.footerHeight || "null",
                    request.template.phantom.orientation || "portrait",
                    request.template.phantom.width || "null",
                    request.template.phantom.height || "null",
                    request.template.phantom.format || "null"
                ];

                childProcess.execFile(binPath, childArgs, function(error, stdout, stderr) {
                    self.reporter.logger.info("Rastering pdf child process end.");

                    if (error !== null) {
                        self.reporter.logger.error('exec error: ' + error);
                        return cb(error);
                    }

                    response.result = fs.createReadStream(childArgs[4]);
                    response.headers["Content-Type"] = "application/pdf";
                    response.headers["File-Extension"] = "pdf";
                    response.isStream = true;

                    self.reporter.logger.info("Rendering pdf end.");
                    return cb();
                });
            });
        });
};

Phantom.prototype._processHeaderFooter = function(request, generationId, type) {
    if (!request.template.phantom[type])
        return q(null);

    var req = extend(true, {}, request);
    req.template = { content: request.template.phantom[type], recipe: "html" };
    req.data = extend(true, {}, request.data);
    req.options.saveResult = false;

    return this.reporter.render(req).then(function(resp) {
        var filePath = join("data/temp", generationId + "-" + type + ".html");
        return FS.write(filePath, resp.result).then(function() {
            request.template.phantom[type + "File"] = filePath;
        });
    });
};
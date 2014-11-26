/*! 
 * Copyright(c) 2014 Jan Blaha
 */

var path = require("path"),
    extend = require("node.extend"),
    fs = require("fs"),
    path = require("path");

function initializeApp(force) {
    console.log("Creating server.js, config.js and package.json ");

    if (!fs.existsSync("server.js") || force) {
        fs.writeFileSync("server.js", "require('jsreport').bootstrapper().start();");
    }

    if (!fs.existsSync("package.json") || force) {
        fs.writeFileSync("package.json", "{\r\n \"name\": \"jsreport-server\",\r\n  \"main\": \"server.js\" }");
    }

    if (!fs.existsSync("prod.config.json") || force) {
        fs.writeFileSync("prod.config.json", fs.readFileSync(path.join(__dirname, "example.config.json")));
    }

    console.log("Done");
}


function init() {
    initializeApp(false);
}

function repair() {
    initializeApp(true);
}

var renderDefaults = {
    connectionString: { name: "InMemory"},
    dataDirectory: path.join(__dirname, "data"),
    blobStorage: "inMemory",
    cacheAvailableExtensions: true,
    logger: { providerName: "dummy"},
    rootDirectory: __dirname,
    tempDirectory: require("os").tmpdir(),
    extensions: ["html", "templates", "data", "phantom-pdf"]
};

var reporter = null;

function start() {
    return require("./lib/bootstrapper.js")(renderDefaults).start().then(function (b) {
        reporter = b.reporter;
        return reporter;
    });
}

function render(req) {
    if (!reporter) {
        return start().then(function () {
            return reporter.render(req);
        });
    }

    return reporter.render(req);
}

function extendDefaults(config) {
    return extend(true, renderDefaults, config);
}

if (require.main === module) {
    //jsreport commandline support can precreate app...

    require('commander')
        .version(require("./package.json").version)
        .usage('[options]')
        .option('-i, --init', 'Initialize server.js, config.json and package.json of application and starts it. For windows also installs service.', init)
        .option('-r, --repair', 'Recreate server.js, config.json and package.json of application to default.', repair)
        .parse(process.argv);


} else {
    module.exports.Reporter = require("./lib/reporter.js");
    module.exports.bootstrapper = require("./lib/bootstrapper.js");
    module.exports.renderDefaults = renderDefaults;
    module.exports.render = render;
    module.exports.start = start;
    module.exports.extendDefaults = extendDefaults;
    module.exports.reporter = reporter;
    module.exports.describeReporting = require("./test/helpers.js").describeReporting;
}

/*! 
 * Copyright(c) 2014 Jan Blaha
 */

var path = require("path"),
    extend = require("node.extend"),
    fs = require("fs"),
    path = require("path"),
    Reporter = require("./lib/reporter.js");


function initializeApp(force) {


    if (!fs.existsSync("server.js") || force) {
        console.log("Creating server.js");
        fs.writeFileSync("server.js", "require('jsreport').bootstrapper().start();");
    }

    if (!fs.existsSync("package.json") || force) {
        console.log("Creating package.json");
        var packageJson = {
            "name": "jsreport-server",
            "dependencies": {
                "jsreport": "*"
            },
            "main": "server.js"
        };
        fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
    }

    if (!fs.existsSync("prod.config.json") || force) {
        console.log("Creating prod.config.json");
        fs.writeFileSync("prod.config.json", fs.readFileSync(path.join(__dirname, "example.config.json")));
    }

    console.log("Initialized");
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
    extensions: ["html", "templates", "data", "phantom-pdf"]
};

function ensureTempFolder() {
    if (renderDefaults.tempDirectory) {
        return;
    }

    renderDefaults.tempDirectory = path.join(require("os").tmpdir(), "jsreport");

    try {
        fs.mkdirSync(renderDefaults.tempDirectory);
    } catch(e) {
        if ( e.code !== 'EEXIST' ) throw e;
    }
}

function start() {
    return require("./lib/bootstrapper.js")(renderDefaults).start().then(function (b) {
        return Reporter.instance;
    });
}

function render(req) {
    if (!Reporter.instance) {
        ensureTempFolder();

        return start().then(function () {
            return Reporter.instance.render(req);
        });
    }

    return Reporter.instance.render(req);
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
    module.exports.reporter = Reporter.instance;
    module.exports.describeReporting = require("./test/helpers.js").describeReporting;
}

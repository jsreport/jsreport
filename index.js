if (require.main === module) {
    var fs = require("fs"),
        path = require("path");

    require('commander')
        .version(require("./package.json").version)
        .usage('[options]')
        .option('-i, --init', 'Initialize server.js, config.js and package.json of application and starts it. For windows also installs service.', init)
        .option('-r, --repair', 'Recreate server.js, config.js and package.json of application to default.', repair)
        .parse(process.argv);

    function initializeApp(force) {
        console.log("Creating server.js, config.js and package.json ");

        if (!fs.existsSync("server.js") || force) {
            fs.writeFileSync("server.js", "ReportingServer = require('jsreport').ReportingServer;\r\nnew ReportingServer(require(\"./config.js\")).start();");
        }

        if (!fs.existsSync("config.js") || force) {
            fs.writeFileSync("config.js", fs.readFileSync(path.join(__dirname, "config.js")));
        }

        if (!fs.existsSync("package.json") || force) {
            fs.writeFileSync("package.json", "{\r\n \"name\": \"jsreport-server\",\r\n  \"main\": \"server.js\" }");
        }

        console.log("Done");
    }


    function init() {
        initializeApp(false);
    }

    function repair() {
        initializeApp(true);
    }
} else {
    module.exports.Reporter = require("./reporter.js");
    module.exports.ReportingServer = require("./reportingServer");
    module.exports.describeReporting = require("./test/helpers.js").describeReporting;
}
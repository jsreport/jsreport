/*! 
 * Copyright(c) 2014 Jan Blaha 
 */


function initializeApp(force) {
    console.log("Creating server.js, config.js and package.json ");

    if (!fs.existsSync("server.js") || force) {
        fs.writeFileSync("server.js", "require('jsreport').bootstrapper().start();");
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

if (require.main === module) {
    //jsreport commandline support can precreate app...

    var fs = require("fs"),
        path = require("path");

    require('commander')
        .version(require("./package.json").version)
        .usage('[options]')
        .option('-i, --init', 'Initialize server.js, config.json and package.json of application and starts it. For windows also installs service.', init)
        .option('-r, --repair', 'Recreate server.js, config.json and package.json of application to default.', repair)
        .parse(process.argv);


} else {
    module.exports.Reporter = require("./lib/reporter.js");
    module.exports.bootstrapper = require("./lib/bootstrapper.js");
    module.exports.describeReporting = require("./test/helpers.js").describeReporting;
}

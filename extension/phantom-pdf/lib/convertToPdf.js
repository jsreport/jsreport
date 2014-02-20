var page = require('webpage').create(),
    system = require('system'),
    fs = require('fs'),
    address, output, size;

output = system.args[2];
page.viewportSize = { width: 600, height: 600 };

var paperSize = {
    format: "",
    orientation: 'portrait',
    margin: system.args[3] != "null" ? system.args[3] :  "1cm",
};

if (system.args[4] != "null") {
    paperSize.header = {
        height: system.args[6] != "null" ? system.args[6] :  "1cm",
        contents: phantom.callback(function(pageNum, numPages) {
            //http://stackoverflow.com/questions/10865849/phantomjs-javascript-read-a-local-file-line-by-line
            //closing file???
            return fs.open(system.args[4], "r").read();
        })
    };
}

if (system.args[5] != "null") {
    paperSize.footer = {
        height: system.args[7] != "null" ? system.args[7] :  "1cm",
        contents: phantom.callback(function(pageNum, numPages) {
            return fs.open(system.args[5], "r").read();
        })
    };
}

page.paperSize = paperSize;

page.open(system.args[1], function() {
    page.render(output);
    phantom.exit();
});

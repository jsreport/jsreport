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

//system.stderr.writeLine('cookie: ' +  system.args[8] + ":" + system.args[9] + " at:" + system.args[10]);
  
phantom.addCookie({
  'name'     : system.args[8],   
  'value'    : system.args[9],
  'domain'   : system.args[10],          
  'httponly' : false,
  'expires'  : (new Date()).getTime() + (1000 * 60 * 60)   /* <-- expires in 1 hour */
});

//page.onResourceRequested = function (request) {
//    system.stderr.writeLine('= onResourceRequested()');
//    system.stderr.writeLine('  request: ' + JSON.stringify(request, undefined, 4));
//};
 
//page.onResourceReceived = function(response) {
//    system.stderr.writeLine('= onResourceReceived()' );
//    system.stderr.writeLine('  id: ' + response.id + ', stage: "' + response.stage + '", response: ' + JSON.stringify(response));
//};
 
//page.onLoadStarted = function() {
//    system.stderr.writeLine('= onLoadStarted()');
//    var currentUrl = page.evaluate(function() {
//        return window.location.href;
//    });
//    system.stderr.writeLine('  leaving url: ' + currentUrl);
//};
 
//page.onLoadFinished = function(status) {
//    system.stderr.writeLine('= onLoadFinished()');
//    system.stderr.writeLine('  status: ' + status);
//};
 
//page.onNavigationRequested = function(url, type, willNavigate, main) {
//    system.stderr.writeLine('= onNavigationRequested');
//    system.stderr.writeLine('  destination_url: ' + url);
//    system.stderr.writeLine('  type (cause): ' + type);
//    system.stderr.writeLine('  will navigate: ' + willNavigate);
//    system.stderr.writeLine('  from page\'s main frame: ' + main);
//};
 
//page.onResourceError = function(resourceError) {
//    system.stderr.writeLine('= onResourceError()');
//    system.stderr.writeLine('  - unable to load url: "' + resourceError.url + '"');
//    system.stderr.writeLine('  - error code: ' + resourceError.errorCode + ', description: ' + resourceError.errorString );
//};
 
//page.onError = function(msg, trace) {
//    system.stderr.writeLine('= onError()');
//    var msgStack = ['  ERROR: ' + msg];
//    if (trace) {
//        msgStack.push('  TRACE:');
//        trace.forEach(function(t) {
//            msgStack.push('    -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
//        });
//    }
//    system.stderr.writeLine(msgStack.join('\n'));
//};
page.open(system.args[1], function() {
    page.render(output);
    phantom.exit();
});

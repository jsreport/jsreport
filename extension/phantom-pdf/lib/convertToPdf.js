var page = require('webpage').create(),
    system = require('system'),
    fs = require('fs'),
    address, output, size;

output = system.args[2];
page.viewportSize = { width: 600, height: 600 };

var paperSize = {
    format: system.args[14] != "null" ? system.args[14] : "",
    orientation: system.args[11],
    margin: system.args[3] != "null" ? system.args[3] :  "1cm",
};

if (system.args[12] != "null") {
    paperSize.width = system.args[12];
}

if (system.args[13] != "null") {
    paperSize.height = system.args[13];
}

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

page.onResourceRequested = function (request, networkRequest ) {
    
    if (request.url.lastIndexOf("file://", 0) === 0 && request.url.lastIndexOf("file:///", 0) !== 0) {
        networkRequest.changeUrl(request.url.replace("file://", "http://"));
    }

    system.stdout.writeLine('= onResourceRequested()');
    system.stdout.writeLine('  request: ' + JSON.stringify(request, undefined, 4));
};
 
page.onResourceReceived = function(response) {
    system.stdout.writeLine('= onResourceReceived()' );
    system.stdout.writeLine('  id: ' + response.id + ', stage: "' + response.stage + '", response: ' + JSON.stringify(response));
};
 
page.onLoadStarted = function() {
    system.stdout.writeLine('= onLoadStarted()');
    var currentUrl = page.evaluate(function() {
        return window.location.href;
    });
    system.stdout.writeLine('  leaving url: ' + currentUrl);
};
 
page.onLoadFinished = function(status) {
    system.stdout.writeLine('= onLoadFinished()');
    system.stdout.writeLine('  status: ' + status);
};
 
page.onNavigationRequested = function(url, type, willNavigate, main) {
    system.stdout.writeLine('= onNavigationRequested');
    system.stdout.writeLine('  destination_url: ' + url);
    system.stdout.writeLine('  type (cause): ' + type);
    system.stdout.writeLine('  will navigate: ' + willNavigate);
    system.stdout.writeLine('  from page\'s main frame: ' + main);
};
 
page.onResourceError = function(resourceError) {
    system.stderr.writeLine('= onResourceError()');
    system.stderr.writeLine('  - unable to load url: "' + resourceError.url + '"');
    system.stderr.writeLine('  - error code: ' + resourceError.errorCode + ', description: ' + resourceError.errorString );
};
 
page.onError = function(msg, trace) {
    system.stderr.writeLine('= onError()');
    var msgStack = ['  ERROR: ' + msg];
    if (trace) {
        msgStack.push('  TRACE:');
        trace.forEach(function(t) {
            msgStack.push('    -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
        });
    }
    system.stderr.writeLine(msgStack.join('\n'));
};

page.open(system.args[1], function() {
    page.render(output);
    phantom.exit();
});

/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * Phantomjs script responsible for converting html into pdf.
 */


var webpage = require('webpage');
var webserver = require('webserver').create();
var system = require('system');
var fs = require('fs');

var page = webpage.create();
page.viewportSize = { width: 600, height: 600 };

var port = system.stdin.readLine();

var service = webserver.listen('127.0.0.1:' + port, function (req, res) {
    try {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');

        var body = JSON.parse(req.post);

        page.paperSize = {
            format: body.options.format || "",
            orientation: body.options.orientation,
            margin: body.options.margin || "1cm",
            width: body.options.width || undefined,
            height: body.options.height || undefined,
            header: body.options.headerFile ? {
                height: body.options.headerHeight || "1cm",
                contents: phantom.callback(function (pageNum, numPages) {
                    return fs.open(body.options.headerFile, "r").read()
                        .replace(/{#pageNum}/g, pageNum)
                        .replace(/{#numPages}/g, numPages);
                })
            } : undefined,
            footer: body.options.footerFile ? {
                height: body.options.footerHeight || "1cm",
                contents: phantom.callback(function (pageNum, numPages) {
                    return fs.open(body.options.footerFile, "r").read()
                        .replace(/{#pageNum}/g, pageNum)
                        .replace(/{#numPages}/g, numPages);
                })
            } : undefined
        };

        page.onResourceRequested = function (request, networkRequest ) {
            if (request.url.lastIndexOf("file://", 0) === 0 && request.url.lastIndexOf("file:///", 0) !== 0) {
                networkRequest.changeUrl(request.url.replace("file://", "http://"));
            }
        };

        page.open(body.url, function () {
            page.render(body.output);
            res.statusCode = 200;
            res.write("done");
            res.close();
        });
    } catch (e) {
        system.stdout.writeLine(JSON.stringify(e));
        res.statusCode = 500;
        res.write(JSON.stringify(e));
        res.close();
    }
});

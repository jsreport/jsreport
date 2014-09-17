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

        page.onResourceRequested = function (request, networkRequest) {
            if (request.url.lastIndexOf("file://", 0) === 0 && request.url.lastIndexOf("file:///", 0) !== 0) {
                networkRequest.changeUrl(request.url.replace("file://", "http://"));
            }
        };

        page.open(body.url, function () {

            var phantomHeader = page.evaluate(function (s) {
                return document.querySelector(s) ? document.querySelector(s).innerHtml : null;
            }, '#phantomHeader');

            var phantomFooter = page.evaluate(function (s) {
                return document.querySelector(s) ? document.querySelector(s).innerHtml : null;
            }, '#phantomFooter');

            var numberOfPages = 0;

            page.paperSize = {
                format: body.options.format || "",
                orientation: body.options.orientation,
                margin: body.options.margin || "1cm",
                width: body.options.width || undefined,
                height: body.options.height || undefined,
                header: {
                    height: body.options.headerHeight || ((phantomHeader || body.options.headerFile) ? "1cm" : "1mm"),
                    contents: phantom.callback(function (pageNum, numPages) {
                        numberOfPages = numPages;

                        if (!phantomHeader && !body.options.headerFile)
                            return "<span></span>";

                        return (phantomHeader || fs.open(body.options.headerFile, "r").read())
                            .replace(/{#pageNum}/g, pageNum)
                            .replace(/{#numPages}/g, numPages);
                    })
                },
                footer: (body.options.footerFile || phantomFooter) ? {
                    height: body.options.footerHeight || "1cm",
                    contents: phantom.callback(function (pageNum, numPages) {
                        return (phantomFooter || fs.open(body.options.footerFile, "r").read())
                            .replace(/{#pageNum}/g, pageNum)
                            .replace(/{#numPages}/g, numPages);
                    })
                } : undefined
            };

            page.render(body.output);
            res.statusCode = 200;

            res.write(numberOfPages);
            res.close();

        });
    } catch (e) {
        system.stdout.writeLine(JSON.stringify(e));
        res.statusCode = 500;
        res.write(JSON.stringify(e));
        res.close();
    }
});

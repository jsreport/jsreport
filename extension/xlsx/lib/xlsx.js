/*! 
 * Copyright(c) 2014 Jan Blaha
 *
 * xlsx recipe constructs excel by dynamic assembling of Open Xml
 */

var path = require("path"),
    q = require("q"),
    uuid = require("uuid").v1,
    fs = require("fs"),
    httpRequest = require("request"),
    toArray = require("stream-to-array"),
    excelbuilder = require('msexcel-builder-extended');

function preview(request, response, cb) {
    var req = httpRequest.post("http://jsreport.net/temp", function (err, resp, body) {
        response.content = new Buffer("<iframe style='height:100%;width:100%' src='https://view.officeapps.live.com/op/view.aspx?src=" + encodeURIComponent("http://jsreport.net/temp/" + body) + "' />");
        response.headers["Content-Type"] = "text/html";
        //sometimes files is not completely flushed and excel online cannot find it immediately
        setTimeout(function () {
            cb();
        }, 500);
    });

    var form = req.form();
    form.append('file', response.stream);
    response.headers["Content-Type"] = "text/html";
}


function responseXlsx(request, response) {
    var deferred = q.defer();

    if (request.options.preview) {
        preview(request, response, function () {
            return deferred.resolve();
        });
    } else {
        response.headers["Content-Type"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetf";
        response.headers["Content-Disposition"] = "inline; filename=\"report.xlsx\"";
        response.headers["File-Extension"] = "xlsx";

        toArray(response.stream, function(err, buf) {
            if (err) {
                return deferred.reject(err);
            }

            response.content = Buffer.concat(buf);
            deferred.resolve();
        });
    }

    return deferred.promise;
}

module.exports = function (reporter, definition) {
    reporter.xlsx = {responseXlsx: responseXlsx};

    reporter.extensionsManager.recipes.push({
        name: "xlsx",
        execute: function (request, response) {
            var generationId = uuid();

            var result = response.content.toString();
            var deferred = q.defer();
            var workbook = excelbuilder.createWorkbook(request.reporter.options.tempDirectory, generationId + ".xlsx");

            var worksheet = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" + result.substring(
                    result.indexOf("<worksheet"),
                    result.indexOf("</worksheet>") + "</worksheet>".length);

            var sheet1 = workbook.createSheet('sheet1', 0, 0);
            sheet1.raw(worksheet);

            if (result.indexOf("<styleSheet") > 0) {
                var stylesheet = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" + result.substring(
                        result.indexOf("<styleSheet"),
                        result.indexOf("</styleSheet>") + "</styleSheet>".length);
                workbook.st.raw(stylesheet);
            }

            return q.ninvoke(workbook, "save").then(function () {
                response.stream = fs.createReadStream(path.join(request.reporter.options.tempDirectory, generationId + ".xlsx"));
                return reporter.xlsx.responseXlsx(request, response);
            });
        }
    });
};
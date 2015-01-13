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
    toArray = require('stream-to-array'),
    excelbuilder = require('msexcel-builder-extended');

function preview(request, response, generationId, cb) {
    var req = httpRequest.post("http://jsreport.net/temp", function (err, resp, body) {
        response.headers["File-Extension"] = "html";
        response.result = "<iframe style='height:100%;width:100%' src='https://view.officeapps.live.com/op/view.aspx?src=" + encodeURIComponent("http://jsreport.net/temp/" + body) + "' />";

        //sometimes files is not completely flushed and excel online cannot find it immediately
        setTimeout(function() {
            cb();
        }, 500);

    });

    var form = req.form();
    form.append('file', fs.createReadStream(path.join(request.reporter.options.tempDirectory, generationId + ".xlsx")));
    response.headers["Content-Type"] = "text/html";
}

function render(request, response, generationId) {
    response.result = fs.createReadStream(path.join(request.reporter.options.tempDirectory, generationId + ".xlsx"));
    response.isStream = true;
    response.headers["Content-Type"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetf";
    response.headers["Content-Disposition"] = "inline; filename=\"report.xlsx\"";
    response.headers["File-Extension"] = "xlsx";
}

function responseXlsx(workbook, generationId, request, response) {
    var deferred = q.defer();

    workbook.save(function (err) {

        if (err) {
            return deferred.reject(err);
        }

        if (request.options.preview) {
            preview(request, response, generationId, function () {
                return deferred.resolve();
            });
        } else {
            render(request, response, generationId);
            toArray(response.result, function (err, arr) {
                if (err) {
                    return deferred.reject(err);
                }
                response.result = Buffer.concat(arr);
                return deferred.resolve();
            });
        }
    });

    return deferred.promise;
}

module.exports = function (reporter, definition) {
    reporter.xlsx = {responseXlsx: responseXlsx};

    reporter.extensionsManager.recipes.push({
        name: "xlsx",
        execute: function (request, response) {

            var generationId = uuid();

            return reporter.renderContent(request, response).then(function () {
                var deferred = q.defer();
                var workbook = excelbuilder.createWorkbook(request.reporter.options.tempDirectory, generationId + ".xlsx");

                var worksheet = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" + response.result.substring(
                        response.result.indexOf("<worksheet"),
                        response.result.indexOf("</worksheet>") + "</worksheet>".length);

                var sheet1 = workbook.createSheet('sheet1', 0, 0);
                sheet1.raw(worksheet);

                if (response.result.indexOf("<styleSheet") > 0) {
                    var stylesheet = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" + response.result.substring(
                            response.result.indexOf("<styleSheet"),
                            response.result.indexOf("</styleSheet>") + "</styleSheet>".length);
                    workbook.st.raw(stylesheet);
                }

                return reporter.xlsx.responseXlsx(workbook, generationId, request, response);
            });
        }
    });
};
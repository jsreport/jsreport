/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Parsing render process input data.
 * Can parse input xls files, input string streams, input text files
 * Output is javascript object
 */

var q = require("q"),
    FS = require("q-io/fs"),
    path = require("path");

module.exports = function(req) {

    var promise = q();

    if (req.files && req.files.file) {
        var file = req.files.file;

        if (path.extname(file.path) === ".xls") {
            var XLS = require('xlsjs');
            //TODO async!!!!
            var xls = XLS.readFile(file.path);
            var data = XLS.utils.sheet_to_row_object_array(xls.Sheets.Sheet1);
            req.data = { rows: [] };

            data.forEach(function(r) {
                var item = {};

                for (var key in r) {
                    if (r.hasOwnProperty(key))
                        item[key] = r[key];
                }

                req.data.rows.push(item);
            });
        } else {
            promise = FS.read(file.path).then(function(content) {
                req.data = content;
            });
        }
    }


    return promise.then(function() {
        if (req.data !== null && req.data !== "undefined" && (typeof req.data === 'string' || req.data instanceof String)) {
            try {
                req.data = JSON.parse(req.data.toString());
            } catch(e) {
                //not a json, try to read as plain text
                req.data = { items: req.data.toString().split("\n") };
            }
        }
    });
}
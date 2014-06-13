/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Parsing xls files into input data in the form
 * {
 *  "rows": [ { 'columnName' : 'val', .. }, ..]
 * }
 */

var XLS = require("xlsjs"),
    path = require("path");

module.exports = function (reporter, definition) {
    reporter.beforeRenderListeners.add(definition.name, this, function(req, res) {

        if (req.files && req.files.file) {
            var file = req.files.file;

            if (path.extname(file.path) === ".xls") {
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
            }
        }
    });
};

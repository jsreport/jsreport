/*! 
 * Copyright(c) 2014 Jan Blaha
 *
 * html-to-xlsx recipe transforms html into xlsx. The process is based on extracting html and css attributes
 * using phantomjs and then assembling excel Open XML.
 */

var path = require("path"),
    q = require("q"),
    uuid = require("uuid").v1,
    fs = require("fs"),
    PhantomManager = require("phantom-workers").PhantomManager,
    excelbuilder = require('msexcel-builder-extended');

var phantomManager;

function componentToHex(c) {
    var hex = parseInt(c).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
}

function rgbToHex(c) {
    return componentToHex(c[0]) + componentToHex(c[1]) + componentToHex(c[2]);
}

function isColorDefined(c) {
    return c[0] !== "0" || c[1] !== "0" || c[2] !== "0" || c[3] !== "0";
}

function getMaxLength(array) {
    var max = 0;
    array.forEach(function (a) {
        if (a.length > max)
            max = a.length;
    });
    return max;
}

function getBorderStyle(border) {
    if (border === "none")
        return undefined;

    if (border === "solid")
        return "thin";

    if (border === "double")
        return "double";

    return undefined;
}

module.exports = function (reporter, definition) {
    reporter.extensionsManager.recipes.push({
        name: "html-to-xlsx",
        execute: function (request, response) {

            var generationId = uuid();

            return reporter.renderContent(request, response).then(function () {
                return q.ninvoke(phantomManager, "execute", response.result);
            }).then(function (table) {
                var workbook = excelbuilder.createWorkbook(request.reporter.options.tempDirectory, generationId + ".xlsx");
                var sheet1 = workbook.createSheet('sheet1', getMaxLength(table.rows), table.rows.length);

                var maxWidths = [];
                for (var i = 0; i < table.rows.length; i++) {
                    var maxHeight = 0;
                    for (var j = 0; j < table.rows[i].length; j++) {
                        var cell = table.rows[i][j];

                        if (cell.height > maxHeight) {
                            maxHeight = cell.height;
                        }

                        if (cell.width > (maxWidths[j] || 0)) {
                            sheet1.width(j + 1, cell.width / 7);
                            maxWidths[j] = cell.width;
                        }

                        sheet1.set(j + 1, i + 1, cell.value);
                        sheet1.align(j + 1, i + 1, cell.horizontalAlign);
                        sheet1.valign(j + 1, i + 1, cell.verticalAlign === "middle" ? "center" : cell.verticalAlign);

                        if (isColorDefined(cell.backgroundColor)) {
                            sheet1.fill(j + 1, i + 1, {
                                type: 'solid',
                                fgColor: 'FF' + rgbToHex(cell.backgroundColor),
                                bgColor: '64'
                            });
                        }

                        sheet1.font(j + 1, i + 1, {
                            family: '3',
                            scheme: 'minor',
                            sz: parseInt(cell.fontSize.replace("px", "")) * 18 / 24,
                            bold: cell.fontWeight === "bold" || parseInt(cell.fontWeight, 10) >= 700,
                            color: isColorDefined(cell.foregroundColor) ? ('FF' + rgbToHex(cell.foregroundColor)) : undefined
                        });

                        sheet1.border(j + 1, i + 1, {
                            left: getBorderStyle(cell.border.left),
                            top: getBorderStyle(cell.border.top),
                            right: getBorderStyle(cell.border.right),
                            bottom: getBorderStyle(cell.border.bottom)
                        });
                    }

                    sheet1.height(i + 1, maxHeight * 18 / 24);
                }

                return reporter.xlsx.responseXlsx(workbook, generationId, request, response);
            });
        }
    });

    if (!phantomManager) {
        phantomManager = new PhantomManager({
            numberOfWorkers: 1,
            pathToPhantomScript: path.join(__dirname, "extractExcel.js")
        });
        return q.ninvoke(phantomManager, "start");
    }
};
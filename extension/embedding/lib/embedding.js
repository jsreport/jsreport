/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 */

var q = require("q"),
    path = require("path");

module.exports = function (reporter, definition) {

    var express = require('express')
    var app = express();
    app.engine('html', require('ejs').renderFile);

    app.get('/example1', function (req, res) {
        res.render(path.join(__dirname, '../public', 'example1.html'));
    });

    app.get('/example2', function (req, res) {
        res.render(path.join(__dirname, '../public', 'example2.html'));
    });

    app.get('/example3', function (req, res) {
        res.render(path.join(__dirname, '../public', 'example3.html'));
    });

    app.get('/', function (req, res) {
        res.render(path.join(__dirname, '../public', 'index.html'));
    });

    app.listen(9000);

    reporter.on("express-configure", function () {

    });
};

var system = require('system'),
    webserver = require('webserver').create(),
    fs = require('fs');

var port = system.stdin.readLine();

var service = webserver.listen('127.0.0.1:' + port, function (req, res) {
    page = require('webpage').create();

    page.onResourceRequested = function (request, networkRequest) {
        //potentially dangerous request
        if (request.url.lastIndexOf("file:///", 0) === 0) {
            networkRequest.changeUrl(request.url.replace("file:///", "http://"));
            return;
        }

        //to support cdn like format //cdn.jquery...
        if (request.url.lastIndexOf("file://", 0) === 0 && request.url.lastIndexOf("file:///", 0) !== 0) {
            networkRequest.changeUrl(request.url.replace("file://", "http://"));
        }
    };

    page.onLoadFinished = function(status) {
        var result = page.evaluate(function() {
            var tableOut = { rows: [] };
            var table = document.querySelector("table");

            if (!table)
                return tableOut;

            for (var r = 0, n = table.rows.length; r < n; r++) {
                var row = [];
                tableOut.rows.push(row);

                for (var c = 0, m = table.rows[r].cells.length; c < m; c++) {
                    var cell = table.rows[r].cells[c];
                    var cs=document.defaultView.getComputedStyle(cell,null);

                    row.push({
                        value: cell.innerHTML,
                        backgroundColor: cs.getPropertyValue('background-color').match(/\d+/g),
                        foregroundColor: cs.getPropertyValue('color').match(/\d+/g),
                        fontSize: cs.getPropertyValue('font-size'),
                        fontWeight: cs.getPropertyValue('font-weight'),
                        verticalAlign: cs.getPropertyValue('vertical-align'),
                        horizontalAlign: cs.getPropertyValue('text-align'),
                        width: cell.clientWidth,
                        height: cell.clientHeight,
                        border: {
                            top: cs.getPropertyValue('border-top-style'),
                            right: cs.getPropertyValue('border-right-style'),
                            bottom: cs.getPropertyValue('border-bottom-style'),
                            left: cs.getPropertyValue('border-left-style'),
                            width: cs.getPropertyValue('border-width-style')
                        }
                    });
                }
            }

            return tableOut;
        });

        res.statusCode = 200;
        res.write(JSON.stringify(result));
        res.close();
    };

    page.setContent(req.post, "http://localhost");
});

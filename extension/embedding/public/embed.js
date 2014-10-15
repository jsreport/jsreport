if (typeof jQuery == 'undefined')
    throw new Error("Missing jquery.")

function arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function loadTemplate(shortid, cb) {
    $.getJSON("http://localhost:2000/odata/templates?$filter=shortid%20eq%20%27" + shortid + "%27&$format=json&v=" + new Date().getTime(), function(data) {
        cb(data.d.results[0]);
    });
}

function clientSideRender($placeholder, template) {
    var htmlIframe = $("<iframe name='clientHtml' frameborder='0'  style='position: relative; height: 100%; width: 100%;'></iframe>");

    $placeholder.append(htmlIframe);

    clientRender({ template: template }, "clientHtml");
}

//window.context = function() {
//    return {
//        test: function() {
//            return "fooxxx";
//        }
//    }
//}

function serverSideRender($placeholder, template) {
    var xhr = new XMLHttpRequest();
    var data = JSON.stringify({ "template": { "shortid": template.shortid }});
    xhr.open('POST', '/api/report', true);
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    xhr.setRequestHeader("Content-length", data.length);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function (e) {
        var contentType = this.getResponseHeader('Content-Type')
        if (contentType.lastIndexOf("application/pdf", 0) === 0) {
            var uInt8Array = new Uint8Array(this.response); // this.response == uInt8Array.buffer
            // var byte3 = uInt8Array[4]; // byte at offset 4
            var pdfObject = $("<object type='application/pdf' style='width:100%;height:80%'></object>");
            pdfObject.attr("data", "data:application/pdf;base64," + arrayBufferToBase64(uInt8Array));
            $placeholder.append(pdfObject);
        }

        if (contentType.lastIndexOf("text/html", 0) === 0) {
            $placeholder.html(ab2str(this.response));
        }
    };

    xhr.send(data);
}

function addEditButton($placeholder, template, reload) {
    var edit = $("<div style='position: absolute; background-color: blue; z-index: 1000'>edit</div>");
    edit.css("left", $placeholder.offset().left + $placeholder.width() - 100);
    edit.css("top", $placeholder.offset().top + 20);
    $placeholder.append(edit);
    edit.click(function() {
        $placeholder.hide();

        openEditor(template.shortid, function() {
            $placeholder.show();
            reload();
        });
    });
}

function openEditor(shortid, onClose) {
    jsreportIFrame.attr("src", "http://localhost:2000/?mode=embedded#" + shortid);
    jsreportIFrame.show();

    var timer = setInterval(function(){
        var closeButton = jsreportIFrame.contents().find("#closeCommand");
        if (closeButton.length) {
            closeButton.on("click", function() {
                closeButton.off("click");
                jsreportIFrame.hide();
                onClose();
            });
            clearInterval(timer);
        }
    }, 200);
}

var JsReport = function () {

};

JsReport.prototype.render = function ($placeholder, shortid) {
    var self = this;
    $placeholder.html("");
    loadTemplate(shortid, function(template) {
        if (template.recipe === "client-html") {
            clientSideRender($placeholder, template);
        } else {
            serverSideRender($placeholder, template);
        }

        addEditButton($placeholder, template, function() {
            self.render($placeholder, shortid);
        });
    });
};

JsReport.prototype.openEditor = function (shortid, options) {
    options = options || {};
    this.data = options.data;

    openEditor(shortid, function() {});
};

var jsreportIFrame = $("<iframe id='myFrame' frameborder='0' style='position: absolute; left: 100px; top:100px; width:1300px; height: 800px; display: none; z-index:101'></iframe>");
$("body").append(jsreportIFrame);

jsreport = new JsReport();
jsreportInit(jsreport);
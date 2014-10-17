if (typeof jQuery == 'undefined')
    throw new Error("Missing jquery.")

function arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[ i ]);
    }
    return window.btoa(binary);
}

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function loadTemplate(url, shortid, cb) {
    $.getJSON(url + "/odata/templates?$filter=shortid%20eq%20%27" + shortid + "%27&$format=json&v=" + new Date().getTime(), function (data) {
        cb(data.d.results[0]);
    });
}

function clientSideRender($placeholder, template) {
    var htmlIframe = $("<iframe name='" + template.shortid + "' frameborder='0'  style='position: relative; height: 100%; width: 100%;'></iframe>");

    $placeholder.append(htmlIframe);

    clientRender({ template: template }, template.shortid);
}

function serverSideRender($placeholder, template) {
    if (template) {
        var iframe = $("<iframe frameborder='0' name='" + template.shortid + "' style='width:100%;height:100%;z-index: 50'></iframe>");
        $placeholder.append(iframe);
    }
    else {
        template = $placeholder;
        $placeholder = null;
    }

    var mapForm = document.createElement("form");
    mapForm.target = $placeholder ? template.shortid : "_blank";
    mapForm.id = template.shortid;
    mapForm.method = "POST";
    mapForm.action = "http://localhost:2000/api/report";

    function addInput(form, name, value) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
    }

    function addBody(path, body) {
        if (body == null)
            return;

        for (var key in body) {
            if ($.isPlainObject(body[key])) {
                addBody(path + "[" + key + "]", body[key]);
            } else {
                addInput(mapForm, path + "[" + key + "]", body[key]);
            }
        }
    }

    addBody("template", template);

    document.body.appendChild(mapForm);
    mapForm.submit();
    $("#" + template.shortid).remove();

//    var xhr = new XMLHttpRequest();
//    var data = JSON.stringify({ template: template });
//    xhr.open('POST', '/api/report', true);
//    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
//    xhr.setRequestHeader("Content-length", data.length);
//    xhr.responseType = 'arraybuffer';
//
//    xhr.onload = function (e) {
//        var contentType = this.getResponseHeader('Content-Type')
//        if (contentType.lastIndexOf("application/pdf", 0) === 0) {
//            var uInt8Array = new Uint8Array(this.response);
//            var pdfObject = $("<object type='application/pdf' style='width:100%;height:80%'></object>");
//            pdfObject.attr("data", "data:application/pdf;base64," + arrayBufferToBase64(uInt8Array));
//            $placeholder.append(pdfObject);
//        }
//
//        if (contentType.lastIndexOf("text/html", 0) === 0) {
//            $placeholder.html(ab2str(this.response));
//        }
//    };
//
//    xhr.send(data);
}

function addEditButton($placeholder, template, reload) {
    var $edit = $("<div style='position: absolute; display:none; z-index: 100;background-color: #d3d3d3; padding:7px; cursor: pointer'><strong>edit</strong></div>");
    var $editShim = $("<div style='position: absolute; display:none; z-index: 20'><iframe visible='true' height='35' width='43' frameborder='0'></iframe></div>");

    $edit.css("left", $placeholder.position().left + $placeholder.outerWidth() - 100);
    $edit.css("top", $placeholder.position().top + 20);
    $editShim.css("left", $placeholder.position().left + $placeholder.outerWidth() - 100);
    $editShim.css("top", $placeholder.position().top + 20);

    $placeholder.append($edit);
    $placeholder.append($editShim);

    $edit.click(function () {
        $placeholder.hide();

        openEditor({ shortid: template.shortid }, function () {
            $placeholder.show();
            reload();
        });
    });

    var visible = false;
    $placeholder.hover(function () {
        if (visible)
            return;
        visible = true;
        $editShim.fadeIn();
        $edit.fadeIn();

        setTimeout(function () {
            $edit.fadeOut();
            $editShim.fadeOut();
            visible = false;
        }, 2000);
    }, function () {
    });
}

function openEditor(template, onClose) {
    $(".jsreport-rolette").show();

    jsreportIFrame.css("width", ($(window).width() - 200) + "px");
    jsreportIFrame.css("height", ($(window).height() - 200) + "px");

    jsreport.template = template;

    jsreportIFrame.attr("src", "http://localhost:2000/?mode=embedded#" + template.shortid);
    jsreportIFrame.show();

    var timer = setInterval(function () {
        var closeButton = jsreportIFrame.contents().find("#closeCommand");
        if (closeButton.length) {
            closeButton.on("click", function () {
                closeButton.off("click");
                jsreportIFrame.hide();
                $(".jsreport-rolette").hide();
                onClose();
            });
            clearInterval(timer);
        }
    }, 200);
}

var JsReport = function () {

};

JsReport.prototype.renderAll = function () {
    var self = this;

    $("[data-jsreport-widget]").each(function() {
        self.render($(this), $(this).attr("data-jsreport-widget"));
    });
}

JsReport.prototype.render = function ($placeholder, template) {
    var self = this;

    if (!template) {
        template = $placeholder;
        $placeholder = null;
    } else {
        $placeholder.html("");
    }

    if (typeof template == 'string' || template instanceof String) {
        template = {
            shortid: template
        }
    }

    if (template.data) {
        template.data = { dataJson: JSON.stringify(template.data)};
    }

    loadTemplate(this.url, template.shortid, function (loadedTemplate) {
        if (loadedTemplate.recipe === "client-html") {
            clientSideRender($placeholder, loadedTemplate);
        } else {
            if ($placeholder)
                serverSideRender($placeholder, template);
            else
                serverSideRender(template);
        }

        if ($placeholder) {
            addEditButton($placeholder, loadedTemplate, function () {
                self.render($placeholder, template);
            });
        }
    });
};

JsReport.prototype.openEditor = function (template) {
    if (typeof template == 'string' || template instanceof String) {
        template = {
            shortid: template
        }
    }
    openEditor(template, function () {
    });
};

JsReport.prototype.setClientContext = function (context) {
    this.context = context;
};

var jsreportIFrame = $("<iframe frameborder='0' style='position: absolute; display: none; left:100px;top: 100px; z-index:1000'></iframe>");
$("body").append(jsreportIFrame);

jsreport = new JsReport();

if (window.jsreportInit !== undefined)
    jsreportInit(jsreport);
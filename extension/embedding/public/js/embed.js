/* globals jsreportInit */

var jsreport = (function (global, jQuery, undefined) {

    if (typeof jQuery === 'undefined')
        throw new Error("Missing jquery.");

    function JsReport() {
        this.serverUrl = getServerUrl();

        this.loaded = false;
        this.recipes = {};
        this.options = {};
        this.headers = this.headers || {};

        var self = this;
        $(function() {
            self.jsreportIFrame = $("<iframe frameborder='0' style='position: absolute; display: none; left:100px;top: 100px; z-index:1000'></iframe>");
            $("body").append(self.jsreportIFrame);
        });
    }

    function JsReportEditorHandle(app) {

    }

    JsReportEditorHandle.prototype.init = function (app) {
        var self = this;
        app.on("close", function (template) {
            _close.call(jsreport);
            self.emit("close", template);
        }).on("full-screen", function () {
            _fullScreen.call(jsreport);
        }).on("small-screen", function () {
            _smallScreen.call(jsreport);
        }).on("template-change", function (tmpl) {
            self.emit("template-change", tmpl);
        });
    };

    var MicroEvent = {
        on: function (event, fct) {
            this._events = this._events || {};
            this._events[event] = this._events[event] || [];
            this._events[event].push(fct);
            return this;
        },
        off: function (event, fct) {
            this._events = this._events || {};
            if (event in this._events === false) return;
            this._events[event].splice(this._events[event].indexOf(fct), 1);
            return this;
        },
        emit: function (event /* , args... */) {
            this._events = this._events || {};
            if (event in this._events === false) return;
            for (var i = 0; i < this._events[event].length; i++) {
                try {
                    this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
                }
                catch(e) {}
            }
            return this;
        }
    };

    function getServerUrl() {
        function scriptUrl() {
            if (document.getElementById("jsreport-embedding")) {
                return document.getElementById("jsreport-embedding").src;
            }
            var scriptEls = document.getElementsByTagName( 'script' );
            var thisScriptEl = scriptEls[scriptEls.length - 1];
            return thisScriptEl.src;
        }

        return scriptUrl().replace("/extension/embedding/public/js/embed.js", "");
    }


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

    function _serverSideRenderToPlaceholder($placeholder, template) {
        var self = this;

        var xhr = new XMLHttpRequest();
        var data = JSON.stringify({ template: template, options: template.options });
        xhr.open('POST', this.serverUrl + '/api/report', true);
        xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
        xhr.setRequestHeader("Content-length", data.length);
        xhr.responseType = 'arraybuffer';

        xhr.onload = function (e) {
            var contentType = this.getResponseHeader('Content-Type');

            $placeholder.html("");

            if (contentType.lastIndexOf("application/pdf", 0) === 0) {
                var uInt8Array = new Uint8Array(this.response); // this.response == uInt8Array.buffer
               //  var byte3 = uInt8Array[4]; // byte at offset 4
                var pdfObject = $("<object type='application/pdf' style='width:100%;height:100%'></object>");
                pdfObject.attr("data", "data:application/pdf;base64," + arrayBufferToBase64(uInt8Array));
                $placeholder.append(pdfObject);
            }

            if (contentType.lastIndexOf("text/html", 0) === 0) {
                var iframe = $("<iframe frameborder='0' name='" + (template.shortid || (new Date().getTime())) + "' style='width:100%;height:100%;z-index: 50'></iframe>");
                $placeholder.append(iframe);
                var ifrm = iframe[0];
                ifrm = (ifrm.contentWindow) ? ifrm.contentWindow : (ifrm.contentDocument.document) ? ifrm.contentDocument.document : ifrm.contentDocument;
                ifrm.jsreport = self;

                iframe[0].onload = function() {
                    ifrm.jsreport = self;
                };

                var doc = ifrm.document;

                if (doc.document) {
                    doc = doc.document;
                }

                doc.open();


                $placeholder.iframe = iframe[0];

                doc.write(ab2str(this.response));
                doc.close();
            }
        };

        xhr.send(data);
    }

    function _serverSideRender(template) {
        var mapForm = document.createElement("form");
        mapForm.target = "_blank";
        mapForm.id = template.shortid;
        mapForm.method = "POST";
        mapForm.action = this.serverUrl + "/api/report";

        function addInput(form, name, value) {
            var input = document.createElement("input");
            input.type = "hidden";
            input.name = name;
            input.value = value;
            form.appendChild(input);
        }

        function addBody(path, body) {
            if (body === null || body === undefined)
                return;

            for (var key in body) {
                if ($.isPlainObject(body[key])) {
                    addBody(path + "[" + key + "]", body[key]);
                } else {
                    if (body[key] !== null && body[key] !== undefined && !(body[key] instanceof Array))
                        addInput(mapForm, path + "[" + key + "]", body[key]);
                }
            }
        }

        addBody("template", template);
        addBody("options", template.options);

        var headers = this.headers;
        headers["host-cookie"] = document.cookie;
        addBody("headers", headers);

        document.body.appendChild(mapForm);
        mapForm.submit();
        $("#" + template.shortid).remove();
    }

    function _openEditor(template, options) {
        if (this._editorHandle) {
            this._editorHandle.off();
            delete this._editorHandle;
        }

        if (typeof template === 'string' || template instanceof String) {
            template = {
                shortid: template
            };
        }

        options = options || {};

        template = $.extend(true, {}, template);

        var self = this;

        if (template.data && typeof template.data.dataJson !== 'string') {
            template.data.dataJson = JSON.stringify(template.data.dataJson || template.data, null, 2);
        }

        $(".jsreport-backdrop").show();

        this.jsreportIFrame.css("width", ($(window).width() - 200) + "px");
        this.jsreportIFrame.css("height", ($(window).height() - 200) + "px");
        this.jsreportIFrame.css("left", "100px");
        this.jsreportIFrame.css("top", "100px");

        this.template = template;

        this._editorHandle = new JsReportEditorHandle();

        this.jsreportIFrame.show();

        _ensureIframeLoaded.call(this, function () {
            options.template = template;
            self.app.trigger("open-template", options);
            self._editorHandle.init(self.app);
        });

        return this._editorHandle;
    }

    function _close() {
        this.jsreportIFrame.hide();
        $(".jsreport-backdrop").hide();
    }

    function _fullScreen() {
        this.jsreportIFrame.css("left", "0px");
        this.jsreportIFrame.css("top", "0px");
        this.jsreportIFrame.css("right", "0px");
        this.jsreportIFrame.css("bottom", "0px");
        this.jsreportIFrame.css("width", ($(window).width()) + "px");
        this.jsreportIFrame.css("height", ($(window).height()) + "px");
    }

    function _smallScreen() {
        this.jsreportIFrame.css("left", "100px");
        this.jsreportIFrame.css("top", "100px");
        this.jsreportIFrame.css("right", null);
        this.jsreportIFrame.css("bottom", null);
        this.jsreportIFrame.css("width", ($(window).width() - 200) + "px");
        this.jsreportIFrame.css("height", ($(window).height() - 200) + "px");
    }

    function _ensureIframeLoaded(cb) {
        var self = this;

        if (this.loaded) {
            return cb();
        }

        this.waitingCb = cb;

        $.ajax({
            dataType: "html",
            url: this.serverUrl + "/?studio=embed&serverUrl=" + encodeURIComponent(this.serverUrl + "/"),
            success: function (data) {
                var doc = self.jsreportIFrame[0].contentWindow || self.jsreportIFrame[0].contentDocument;
                if (doc.document) {
                    doc = doc.document;
                }

                doc.documentElement.innerHTML = "";

                doc.open();
                doc.write(data);
                doc.close();
            }
        });
    }

    jQuery.cachedScript = function (url, options) {
        options = $.extend(options || {}, {
            dataType: "script",
            cache: true,
            url: url
        });

        return jQuery.ajax(options);
    };

    var _ensuredScripts = {};
    function _ensureScript(scriptUrl, cb) {
        if (_ensuredScripts[scriptUrl] && _ensuredScripts[scriptUrl].done) {
            return cb();
        }

        if (!_ensuredScripts[scriptUrl])
            _ensuredScripts[scriptUrl] = { cbs: []};

        _ensuredScripts[scriptUrl].cbs.push(cb);

        if (_ensuredScripts[scriptUrl].cbs.length > 1)
            return;

        $.cachedScript(scriptUrl, {
            success: function () {
                _ensuredScripts[scriptUrl].done = true;
                _ensuredScripts[scriptUrl].cbs.forEach(function (c) { c(); });
            }
        });
    }

    function _render($placeholder, originalTemplate) {
        var self = this;

        if (!originalTemplate) {
            originalTemplate = $placeholder;
            $placeholder = null;
        } else {
            $placeholder.html("");
        }

        if (typeof originalTemplate === 'string' || originalTemplate instanceof String) {
            originalTemplate = {
                shortid: originalTemplate
            };
        }

        var template = $.extend(true, {}, originalTemplate);

        if (template.data && typeof template.data.dataJson !== 'string') {
            template.data.dataJson = JSON.stringify(template.data.dataJson);
        }

        if (template.recipe === "client-html" && template.content) {
            if (!$placeholder)
                throw new Error("client rendering is allowed only into the placeholder");
            var target = (template.shortid || (new Date().getTime()));
            var iframe = $("<iframe frameborder='0' name='" + target + "' style='width:100%;height:100%;z-index: 50'></iframe>");
            $placeholder.append(iframe);

            _ensureScript(self.serverUrl + "/extension/client-html/public/js/client.render.js", function () {
                self.recipes["client-html"]({ template: template, data: originalTemplate.data }, target);
            });
        } else {
            if ($placeholder)
                _serverSideRenderToPlaceholder.call(self, $placeholder, template);
            else
                _serverSideRender.call(self, template);
        }
    }

    function _renderAll() {
        var self = this;

        $("[data-jsreport-widget]").each(function () {
            _render.call(self, $(this), $(this).attr("data-jsreport-widget"));
        });
    }

    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i=0; i<ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)===' ') c = c.substring(1);
            if (c.indexOf(name) === 0) return c.substring(name.length,c.length);
        }
        return "";
    }

    function _onLoaded(app) {
        this.loaded = true;
        this.app = app;
        app.headers = this.headers;
        $.extend(app.options, this.options);
        this.waitingCb();
    }

    JsReport.prototype = {
        renderAll: function () {
            _renderAll.call(this);
        },
        render: function ($placeholder, template) {
            _render.call(this, $placeholder, template);
        },
        openEditor: function (template, options) {
            return _openEditor.call(this, template, options);
        },
        ensureScript: function (scriptUrl, cb) {
            return _ensureScript(this.serverUrl + scriptUrl, cb);
        },
        setClientContext: function (context) {
            this.context = context;
        },
        onClose: function () {
        },
        _onLoaded: function (app) {
            return _onLoaded.call(this, app);
        }
    };

    jQuery.extend(JsReport.prototype, MicroEvent);
    jQuery.extend(JsReportEditorHandle.prototype, MicroEvent);

    var jsreportInstance = new JsReport();

    setTimeout(function () {
        if (window.jsreportInit !== undefined) {
            jsreportInit(jsreportInstance);
        }
    }, 0);

    if (window.jsreport) {
        jQuery.extend(jsreportInstance, window.jsreport);
    }

    return jsreportInstance;

})(this, this.jQuery);
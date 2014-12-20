/* globals jsreportInit */

var jsreport = (function (global, jQuery, undefined) {

    //already loaded
    if (window.jsreport)
        return window.jsreport;

    if (typeof jQuery === 'undefined')
        throw new Error("Missing jquery.");

    function JsReport() {
        this.serverUrl = document.getElementById("jsreport-embedding") ?
            document.getElementById("jsreport-embedding").src.replace("/extension/embedding/public/js/embed.js", "") :
            window.location;

        this.jsreportIFrame = $("<iframe frameborder='0' style='position: absolute; display: none; left:100px;top: 100px; z-index:1000'></iframe>");
        $("body").append(this.jsreportIFrame);

        this.loaded = false;
        this.recipes = {};
        this.options = {};
    }

    function JsReportEditorHandle(app) {

    }

    JsReportEditorHandle.prototype.init = function (app) {
        var self = this;
        app.on("close", function () {
            _close.call(jsreport);
            self.emit("close");
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
                this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
            }
            return this;
        }
    };

    function _loadTemplate(shortid, cb) {
        $.ajax({
            url: this.serverUrl + "/odata/templates?$filter=shortid%20eq%20%27" + shortid + "%27&$format=json&v=" + new Date().getTime(),
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                cb(data.d.results.length === 1 ? data.d.results[0] : null);
            },
            error: function () {
                alert('Failed to get a template');
            },
            beforeSend: function (xhr, settings) {
                xhr.setRequestHeader('host-cookie', document.cookie);
                settings.url += "&studio=embed";
            }
        });
    }

    function _serverSideRender(target, template) {

        var mapForm = document.createElement("form");
        mapForm.target = target ? target : "_blank";
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

        var headers = this.headers || {};
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

        options = options || {};

        template = $.extend(true, {}, template);

        var self = this;

        if (typeof template === 'string' || template instanceof String) {
            template = {
                shortid: template
            };
        }

        if (template.data && typeof template.data.dataJson !== 'string') {
            template.data.dataJson = JSON.stringify(template.data.dataJson);
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

    var _ensureCallbacks = [];
    function _ensureClientHtmlLoaded(serverUrl, cb) {
        if (jsreport.recipes["client-html"]) {
            return cb();
        }

        _ensureCallbacks.push(cb);

        if (_ensureCallbacks.length > 1)
            return;

        $.cachedScript(serverUrl + "extension/client-html/public/js/client-html.js", {
            success: function () {
                _ensureCallbacks.forEach(function (c) { c(); });
            }
        });
    }

    function _render($placeholder, template) {
        var self = this;

        if (!template) {
            template = $placeholder;
            $placeholder = null;
        } else {
            $placeholder.html("");
        }

        if (typeof template === 'string' || template instanceof String) {
            template = {
                shortid: template
            };
        }

        template = $.extend(true, {}, template);

        if (template.data && typeof template.data.dataJson !== 'string') {
            template.data.dataJson = JSON.stringify(template.data.dataJson);
        }

        function renderFn(loadedTemplate) {
            if (!loadedTemplate)
                return alert("Template was not found or user doesn't have a granted access to it.");

            var frameId = loadedTemplate.shortid || new Date().getTime();
            if ($placeholder) {
                var iframe = $("<iframe frameborder='0' name='" + frameId + "' style='width:100%;height:100%;z-index: 50'></iframe>");
                $placeholder.append(iframe);
            }

            if (template.recipe === "client-html") {
                _ensureClientHtmlLoaded(self.serverUrl, function () {
                    self.recipes["client-html"]({ template: loadedTemplate }, frameId);
                });
            } else {
                _serverSideRender.call(self, frameId, template);
            }
        }

        if (template.shortid) {
            _loadTemplate.call(self, template.shortid, function (loadedTemplate) {
                renderFn(loadedTemplate);
            });
        } else {
            renderFn(template);
        }
    }

    function _renderAll() {
        var self = this;

        $("[data-jsreport-widget]").each(function () {
            _render.call(self, $(this), $(this).attr("data-jsreport-widget"));
        });
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

    var jsreport = new JsReport();

    setTimeout(function () {
        if (window.jsreportInit !== undefined)
            jsreportInit(jsreport);
    }, 0);

    return jsreport;

})(this, this.jQuery);
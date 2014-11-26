/* globals jsreportInit */

var jsreport = (function (global, jQuery, undefined) {

    //already loaded
    if (window.jsreport)
        return window.jsreport;

    if (typeof jQuery === 'undefined')
        throw new Error("Missing jquery.");

    function JsReport() {
        this.serverUrl = document.getElementById("jsreport-embedding") ?
            document.getElementById("jsreport-embedding").src.replace("/extension/embedding/public/embed.js", "") :
            window.location;

        this.jsreportIFrame = $("<iframe frameborder='0' style='position: absolute; display: none; left:100px;top: 100px; z-index:1000'></iframe>");
        $("body").append(this.jsreportIFrame);

        this.loaded = false;
        this.recipes = {};
    }


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

    function _serverSideRender($placeholder, template) {

        var mapForm = document.createElement("form");
        mapForm.target = $placeholder ? template.shortid : "_blank";
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

    function _addEditButton($placeholder, template, reload) {
        var self = this;

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

            _openEditor.call(self,{shortid: template.shortid}, {}, function () {
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

    function _openEditor(template, options, onClose) {
        var self = this;
        if (typeof template === 'string' || template instanceof String) {
            template = {
                shortid: template
            };
        }

        options = $.extend({fetch: true}, options);
        $(".jsreport-backdrop").show();

        this.jsreportIFrame.css("width", ($(window).width() - 200) + "px");
        this.jsreportIFrame.css("height", ($(window).height() - 200) + "px");

        this.template = template;

        this.jsreportIFrame.show();
        _ensureIframeLoaded.call(this, function () {
            options.template = template;
            self.app.trigger("open-template", options);

            var timer = setInterval(function () {
                var closeButton = self.jsreportIFrame.contents().find("#closeCommand");

                if (closeButton.length) {
                    closeButton.on("click", function () {
                        closeButton.off("click");
                        self.jsreportIFrame.hide();
                        $(".jsreport-backdrop").hide();

                        if (onClose)
                            onClose();
                    });

                    var fullScreenButton = self.jsreportIFrame.contents().find("#fullScreenCommand");
                    fullScreenButton.on("click", function () {
                        smallScreenButton.show();
                        fullScreenButton.hide();
                        self.jsreportIFrame.css("left", "0px");
                        self.jsreportIFrame.css("top", "0px");
                        self.jsreportIFrame.css("right", "0px");
                        self.jsreportIFrame.css("bottom", "0px");
                        self.jsreportIFrame.css("width", ($(window).width()) + "px");
                        self.jsreportIFrame.css("height", ($(window).height()) + "px");
                    });

                    var smallScreenButton = self.jsreportIFrame.contents().find("#smallScreenCommand");
                    smallScreenButton.on("click", function () {
                        fullScreenButton.show();
                        smallScreenButton.hide();
                        self.jsreportIFrame.css("left", "100px");
                        self.jsreportIFrame.css("top", "100px");
                        self.jsreportIFrame.css("right", null);
                        self.jsreportIFrame.css("bottom", null);
                        self.jsreportIFrame.css("width", ($(window).width() - 200) + "px");
                        self.jsreportIFrame.css("height", ($(window).height() - 200) + "px");
                    });

                    clearInterval(timer);
                }
            }, 200);
        });
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

        if (template.data) {
            template.data = {dataJson: JSON.stringify(template.data)};
        }

        function renderFn(loadedTemplate) {
            if (!loadedTemplate)
                return alert("Template was not found or user doesn't have a granted access to it.");

            if ($placeholder) {
                var iframe = $("<iframe frameborder='0' name='" + loadedTemplate.shortid + "' style='width:100%;height:100%;z-index: 50'></iframe>");
                $placeholder.append(iframe);
            }

            if (self.recipes["client-html"]) {
                self.recipes["client-html"]({ template: loadedTemplate}, loadedTemplate.shortid);
            } else {
                _serverSideRender.call(self, $placeholder, template);
            }

            if ($placeholder) {
                _addEditButton.call(self, $placeholder, loadedTemplate, function () {
                    _render.call(self, $placeholder, template);
                    self.onClose();
                });
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
        this.waitingCb();
        window.parent.postMessage({ command: "jsreport-loaded" }, "*");
    }


    JsReport.prototype = {
        renderAll: function() {
            _renderAll.call(this);
        },
        render: function($placeholder, template) {
            _render.call(this, $placeholder, template);
        },
        openEditor: function(template, options, onClose) {
            _openEditor.call(this, template, options, onClose);
        },
        setClientContext: function(context) {
            this.context = context;
        },
        onClose: function() {
        },
        onLoaded: function(app) {
            _onLoaded.call(this, app);
        }
    };

    var jsreport = new JsReport();

    setTimeout(function(){
        if (window.jsreportInit !== undefined)
            jsreportInit(jsreport);
        }, 0);

    return jsreport;

})(this, this.jQuery);
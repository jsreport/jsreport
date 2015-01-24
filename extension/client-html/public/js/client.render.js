/* globals Handlebars, jsreport */

var clientRender = (function (global, jQuery, undefined) {

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

    function renderJsRender(content, helpers, data, cb) {
        jsreport.ensureScript("/extension/client-html/public/js/jsrender.min.js", function () {
            var tmpl = $.templates(content);
            data = data || {};
            try {
                cb(tmpl.render(data, helpers));
            }
            catch (e) {
                cb(escapeHtml(e.toString()));
            }
        });
    }

    function escapeHtml(string) {
        var entityMap = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': '&quot;',
            "'": '&#39;',
            "/": '&#x2F;'
        };

        return String(string).replace(/[&<>"'\/]/g, function (s) {
            return entityMap[s];
        });
    }

    function renderHandlebars(content, helpers, data, cb) {
        jsreport.ensureScript("/extension/client-html/public/js/handlebars.min.js", function () {
            try {
                if (helpers) {
                    for (var h in helpers) {
                        if (helpers.hasOwnProperty(h)) {
                            Handlebars.registerHelper(h, helpers[h]);
                        }
                    }
                }

                var compiledTemplate = Handlebars.compile(content);

                cb(compiledTemplate(data));
            }
            catch (e) {
                cb(escapeHtml(e.toString()));
            }
        });
    }

    function renderHtml(request, cb) {

        function getHelpers() {
            var regex = /function[\s]*([^(]*)/g;

            var afterScript = "";
            var matches;
            while (matches = regex.exec(request.template.helpers)) {
                if (matches[1])
                    afterScript += "try {this." + matches[1] + "=" + matches[1] + ";}catch(e){}";
            }

            eval(request.template.helpers + afterScript);
        }

        var sandbox = {};
        getHelpers.apply(sandbox);

        if (request.template.engine === "handlebars")
            return renderHandlebars(request.template.content, sandbox, request.data, cb);

        if (request.template.engine === "jsrender")
            return renderJsRender(request.template.content, sandbox, request.data, cb);

        throw new Error("Unsupported engine " + request.template.engine);
    }

    var requestList = {};

    function reload(id, selector, data) {

        if ((typeof selector !== 'string' && selector instanceof String)) {
            data = selector;
            selector = undefined;
        }

        var request = requestList[id];
        request.data = data;
        request.isReload = true;
        clientRender(request, request.target, selector);
    }

    return function (request, target, selector) {
        request.target = target;
        request.selector = selector;
        requestList[target] = request;

        var $iframe = $("iframe[name='" + target + "']");

        window.jsreport = window.jsreport || window.top.jsreport || {};
        window.jsreport.ensureScript = window.jsreport.ensureScript || _ensureScript;

        window.jsreport.request = request;
        window.jsreport.reloadForId = reload;

        window.jsreport.refreshForId = function (id, template) {
            var request = requestList[id];
            var placeholder = $("iframe[name='" + target + "']").parent();
            $("iframe[name='" + target + "']").remove();
            jsreport.render(placeholder, template);
        };

        renderHtml(request, function (output) {
            if (selector) {
                var htmlCut = selector === "body" ? output : $(output).filter(selector).html();
                $iframe.contents().find(selector).html(htmlCut);
                return;
            }

            output = "<script>" +
            "window.jsreport = parent.jsreport || window.jsreport || {};" +
            "window.jsreport.reload = function(selector, data) { parent.jsreport.reloadForId('" + target + "', selector, data); };" +
            "window.jsreport.refresh = function(template) { parent.jsreport.refreshForId('" + target + "', template)};" +
            "window.jsreport.context = parent.jsreport.context;" +
            "</script>" + output;

            $iframe.attr("src", "");

            var doc = $iframe[0].contentWindow || $iframe[0].contentDocument;

            //wait a little bit until potential pdf iframe is really gone
            setTimeout(function () {
                if (doc.document) {
                    doc = doc.document;
                }

                doc.documentElement.innerHTML = "";

                doc.open();
                doc.write(output);
                doc.close();
            }, 10);
        });
    };
})(this, this.jQuery);

if (window.jsreport) {
    jsreport.recipes["client-html"] = clientRender;
}
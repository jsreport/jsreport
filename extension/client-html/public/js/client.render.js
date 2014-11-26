/* globals Handlebars, jsreport */

var clientRender = (function (global, jQuery, undefined) {

    function renderJsRender(content, helpers, data) {
        var tmpl = $.templates(content);
        data = data || { };
        return tmpl.render(data, helpers);
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

    function renderHandlebars(content, helpers, data) {

        if (helpers) {
            for (var h in helpers) {
                if (helpers.hasOwnProperty(h)) {
                    Handlebars.registerHelper(h, helpers[h]);
                }
            }
        }

        var compiledTemplate = Handlebars.compile(content);

        return compiledTemplate(data);
    }

    function renderHtml(request) {

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
        getHelpers.bind(sandbox)();

        try {
            if (request.template.engine === "handlebars")
                return renderHandlebars(request.template.content, sandbox, request.data);

            if (request.template.engine === "jsrender")
                return renderJsRender(request.template.content, sandbox, request.data);

            throw new Error("Unsupported engine " + request.template.engine);

        } catch (e) {
            return escapeHtml(e.toString());
        }
    }

    var requestList = {};

    function reload(id, selector, data) {
        if (!data) {
            data = selector;
            selector = "body";
        }

        var request = requestList[id];
        request.data = data;
        request.isReload = true;
        clientRender(request, request.target, selector);
    }

    return function(request, target, selector) {
        request.target = target;
        request.selector = selector;
        requestList[request.template.shortid] = request;

        var $iframe = $("iframe[name='" + target + "']");

        window.jsreport = window.jsreport || {};

        if (parent.jsreport) {
            window.jsreport = parent.jsreport;
        }

        window.jsreport.request = request;
        window.jsreport.reloadForId = reload;

        var output = renderHtml(request);

        if (selector) {
            var htmlCut = selector === "body" ? output : $(output).filter(selector).html();
            $iframe.contents().find(selector).html(htmlCut);
            return;
        }

        output = "<script>" +
            "window.jsreport = window.jsreport || {}; window.jsreport.reload = function(selector, data) { parent.jsreport.reloadForId('" + request.template.shortid + "', selector, data); };" +
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

    };
})(this, this.jQuery);

if (window.jsreport) {
    jsreport.recipes["client-html"] = clientRender;
}
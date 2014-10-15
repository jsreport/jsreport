function renderJsRender(content, helpers, data) {
    var tmpl = $.templates(content);
    data = data || { } ;
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
        while (matches = regex.exec(request.template.helpers)) {
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
    } catch (e) {
        return escapeHtml(e.toString());
    }

    throw new Error("Unsupported engine " + request.template.engine);
}

var lastRequest;
var lastTarget;

function clientRender(request, target, selector) {
    lastRequest = request;
    lastTarget = target;
    var $iframe = $("iframe[name='" + target + "']");


    var output = renderHtml(request);

    if (selector) {
        var htmlCut = $(output).filter(selector);
        $iframe.contents().find(selector).html(htmlCut.html());
        return;
    }

    $iframe.attr("src", "");
    
    var doc = $iframe[0].contentWindow || $iframe[0].contentDocument;
    if (doc.document) {
        doc = doc.document;
    }

    doc.documentElement.innerHTML = "";

    doc.open();
    doc.write(output);
    doc.close();
}

window.context = function() {
    return {
        test: function() {
            return "foo";
        },
        reload: function(selector, data) {
            lastRequest.data = data;
            clientRender(lastRequest, lastTarget, selector)
        }
    }
}
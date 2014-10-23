define(["underscore", "jquery", "app"], function (_, $, app) {

    function getUIState(model) {

        function justNotNull(o) {
            var clone = {};
            for (var key in o) {
                if (o[key] != null)
                    clone[key] = o[key];
            }

            return clone;
        }

        var state = {};
        var json = model.toJSON();
        for (var key in json) {
            if (json[key] != null) {
                if (json[key].initData != null)
                    state[key] = justNotNull(json[key].toJSON());
                else
                    state[key] = json[key];
            }
        }

        state.content = state.content || " ";
        state.helpers = state.helpers || "";

        delete state._id;
        delete state.shortid;
        return state;
    }

    function addInput(form, name, value) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
    }

    var fn = function (model, beforeRenderListeners, target) {
        //this.contentView.$el.find(".preview-loader").show();
        //http://connect.microsoft.com/IE/feedback/details/809377/ie-11-load-event-doesnt-fired-for-pdf-in-iframe
        //this.contentView.$el.find("[name=previewFrame]").hide();

        var uiState = getUIState(model);

        var request = { template: uiState };

        beforeRenderListeners.fire(request, function (er) {
            if (er) {
                //self.contentView.$el.find(".preview-loader").hide();
                app.trigger("error", { responseText: er });
                return;
            }

            if (uiState.recipe === "client-html") {
                return app.clientHtml(request, target);
            }

            var mapForm = document.createElement("form");
            mapForm.target = target;
            mapForm.method = "POST";
            mapForm.action = app.serverUrl + "api/report";

            function addBody(path, body) {
                if (body == null)
                    return;

                if (body.initData != null)
                    body = body.initData;

                for (var key in body) {
                    if (_.isObject(body[key])) {
                        addBody(path + "[" + key + "]", body[key]);
                    } else {
                        addInput(mapForm, path + "[" + key + "]", body[key]);
                    }
                }
            }

            addBody("template", uiState);
            if (request.options != null)
                addBody("options", request.options);

            if (request.data != null)
                addInput(mapForm, "data", request.data);

            addInput(mapForm, "header-host-cookie", document.cookie);

            document.body.appendChild(mapForm);
            mapForm.submit();
            app.trigger("after-template-render");
        });
    }

    return fn;
});

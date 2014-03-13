define(["app", "marionette", "core/view.base"], function(app, Marionette, ViewBase) {
    return ViewBase.extend({
        tagName: "li",
        template: "gists-template",

        initialize: function() {
            _.bindAll(this, "isFilled");
        },

        isFilled: function() {
            return this.model.get("gistId") != null;
        },

        authenticate: function(cb) {
            var gitAuth = window.open('/api/gists/login');
            
            var interval = setInterval(function() {
                $.getJSON('/api/gists/validate', function(data) {
                    if (data.result) {
                        gitAuth.close();
                        cb();
                        clearInterval(interval);
                    }
                });
            }, 1000);
        },

        save: function() {
            var self = this;
            this.authenticate(function() {
                $.post("/api/gists/" + self.model.get("gistId"), {}, function() {
                    self.model.save({}, {
                        success: function() {
                            app.trigger("template-saved", self.model);
                        }
                    });
                });
            });
        },
    });
});
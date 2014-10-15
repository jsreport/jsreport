/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["jquery", "app", "underscore", "async"], function($, app, _, async) {
    return (function() {

        function Manager() {
        }

        Manager.prototype = {
            get registredExtensions() {
                return this._registredExtensions;
            },
            set registredExtensions(val) {
                this._registredExtensions = val;
            },

            get extensions() {
                return this._extensions;
            },
            set extensions(val) {
                this._extensions = val;
            }
        };

        Manager.prototype.init = function(done) {
            var self = this;

            this.getExtensions(function(res) {
                self.extensions = res;
                self.registredExtensions = _.filter(self.extensions, function(ext) {
                    return ext.isRegistered;
                });

                done();
            });
        };

        Manager.prototype.getExtensions = function(resultCallback) {
            $.getJSON(app.serverUrl + "api/extensions", resultCallback);
        };

        Manager.prototype.loadExtensions = function(cb) {
            async.eachSeries(this.registredExtensions, function(extension, innercb) {
                if (extension.hasPublicPart === false || extension.name === "express")
                   return innercb(null);

                var main = "main";
                if (jsreport_mode === "development") {
                    main = "main_dev";
                }

                if (jsreport_mode === "embedded") {
                    if (!extension.embeddedSupport)
                        return innercb(null);
                    main = "main_embed";
                }

                function loadExtension(main) {
                    require.config({
                        packages: [
                            {
                                name: extension.name,
                                location: '/extension/' + extension.name + '/public/js',
                                main: main
                                //main: extension.publicMain || (jsreport_mode === "development" ? "main" : "main_built")
                            }
                        ]
                    });
                    require([extension.name], function() {
                        innercb();
                    }, function(e) {
                        console.log(e);
                        if (main !== "main")
                            return loadExtension("main");
                        innercb();
                    });
                }

                loadExtension(main);
            }, cb);
        };

        Manager.prototype.registerExtensions = function(extension, done) {
            $.post(app.serverUrl + "api/extensions", extension, done);
        };

        return Manager;
    })();
});
/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["jquery", "app", "core/utils", "core/view.base", "core/aceBinder"],
    function($, app, Utils, LayoutBase, aceBinder) {
        
        return LayoutBase.extend({
            template: "template-detail",
            contentEditor: null,
            helpersEditor: null,
            className: 'template-detail-wrap',

            initialize: function() {
                var self = this;

                this.listenTo(this.model, "sync", function() {
                    if (self.viewRendered)
                        return;
                    
                    self.render();
                    self.viewRendered = true;
                });
                
                this.listenTo(this, "close", function() {
                    $(".side-nav-right").show();
                });
            },

            events: {
                "click #previewPane": "triggerPreview"
            },

            onDomRefresh: function() {
                var self = this;
                $(".side-nav-right").hide();

                //var langTools = ace.require("ace/ext/language_tools");

                //var dataCompleter = {
                //    getCompletions: function(editor, session, pos, prefix, callback) {
                //        if (prefix.length === 0) {
                //            return callback(null, []);
                //        }
                //        // wordList like [{"word":"flow","freq":24,"score":300,"flags":"bc","syllables":"1"}]
                //        return callback(null, [
                //            { name: "jsreport", value: "jsreport", score: 300, meta: "jsreport" }]
                //        );
                //    }
                //};
                
                //langTools.addCompleter(dataCompleter);
                
                
                this.contentEditor = ace.edit("htmlArea");
                this.contentEditor.setTheme("ace/theme/chrome");
                this.contentEditor.getSession().setMode("ace/mode/handlebars");
                this.contentEditor.setOptions({
                     enableBasicAutocompletion: true,
                     enableSnippets: true
                });

                aceBinder(this.model, "content", this.contentEditor);
             

                this.helpersEditor = ace.edit("helpersArea");
                this.helpersEditor.setTheme("ace/theme/chrome");
                this.helpersEditor.getSession().setMode("ace/mode/javascript");
                this.helpersEditor.setOptions({
                     enableBasicAutocompletion: true,
                     enableSnippets: true
                });
                
                aceBinder(this.model, "helpers", this.helpersEditor);

                self.$el.find("#previewFrameWrap").contents().find('html').html(
                    "<iframe name='previewFrame' frameborder='0' allowtransparency='true' allowfullscreen='true' style='width: 100%; height: 100%;'></iframe>");


                self.$el.find("[name=previewFrame]").on("load", function() {
                    self.$el.find(".preview-loader").hide();
                    //http://connect.microsoft.com/IE/feedback/details/809377/ie-11-load-event-doesnt-fired-for-pdf-in-iframe
                    //$(this).show();
                });

                self.listenTo(app.layout, "dialog-opening", function() {
                    self.$el.find("[name=previewFrame]").hide();
                });

                self.listenTo(app.layout, "dialog-closing", function() {
                    self.$el.find("[name=previewFrame]").show();
                });


                this.$el.find(".split-pane").splitPane();
            },
            triggerPreview: function() {
                this.trigger("preview");
            },

            validateLeaving: function() {
                return !this.model.hasChangesSyncLastSync();
            }
        });
    });
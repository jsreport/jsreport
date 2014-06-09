module.exports = function(grunt) {

    var commonPath = {
        jquery: "empty:",
        marionette: "empty:",
        async: "empty:",
        underscore: "empty:",
        toastr: "empty:",
        deferred: "empty:",
        app: "empty:",
        backbone: "empty:",
        ace: "empty:",
        "ace/ace": "empty:",
        "core/basicModel": "empty:",
        "core/jaydataModel": "empty:",
        "core/aceBinder": "empty:",
        "core/view.base": "empty:",
        "core/dataGrid": "empty:",
        "jsrender.bootstrap": "empty:",
        "core/utils": "empty:",
        "core/listenerCollection": "empty:"
    };

    function extensionOptimalization(name) {
        return {
            options: {
                paths: commonPath,
                baseUrl: "./extension/" + name + "/public/js",
                out: "extension/" + name + "/public/js/main_built.js",
                optimize: "none",
                name: "main",
                onBuildWrite: function(moduleName, path, contents) {
                    var regExp = new RegExp("\"[.]/", "g");
                    return contents.replace("define('main',", "define(").replace(regExp, "\"");
                }
            }
        };
    };

    var extensions = ["express", "templates", "html", "phantom-pdf", "fop", "scripts", "data", "images", "examples", "statistics", "reports"];

    function copyFiles() {
        var result = [];

        result.push({ src: ['extension/express/public/js/app.js'], dest: 'extension/express/public/js/app_dev.js' });

        extensions.forEach(function(e) {
            result.push({
                src: "extension/" + e + "/public/js/main.js",
                dest: "extension/" + e + "/public/js/main_dev.js"
            });
        });


        return result;
    }
    
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        mocha_phantomjs: {
            test: {
                src: ['test/ui/tests.html'],
                run: true
            }
        },
        mochaTest: {
            test: {
                src: ['extension/*/test/*.js', 'test/*.js']
            },
            testExact: {
                src: ['test/renderTest.js']
            },
            testAll: {
                src: ['extension/*/test/*.js', 'test/*.js', 'extension/*/integrationTest/*.js']
            }
        },

        copy: {
            dev: { files: copyFiles() }
        },

        requirejs: {
            compileApp: {
                options: {
                    baseUrl: "./extension/express/public/js",
                    mainConfigFile: './extension/express/public/js/require_main.js',
                    out: "extension/express/public/js/app_built.js",
                    name: 'app',
                    removeCombined: true,
                    findNestedDependencies: true,
                    onBuildWrite: function(moduleName, path, contents) {
                        return contents.replace("define('app',", "define(");
                    }
                }
            },

            compileTemplates: extensionOptimalization("templates"),
            compileImages: extensionOptimalization("images"),
            compileScripts: extensionOptimalization("scripts"),
            compileData: extensionOptimalization("data"),
            compileReports: extensionOptimalization("reports"),
            compileStatistics: extensionOptimalization("statistics"),
            compilePhantom: extensionOptimalization("phantom-pdf")
        },
        
        replace: {
            devRoot: {
                src: ['./extension/express/public/views/root.html'],
                dest: ['./extension/express/public/views/root_dev.html'],
                replacements: [ { from: '{{dynamicBust}}', to: "new Date().getTime()" },  { from: '{{staticBust}}', to: "" } ]
            },
            devApp: {
                src: ['./extension/express/public/js/app.js'],
                dest: ['./extension/express/public/js/app_dev.js'],
                replacements: [ 
                    { from: '{{templateBust}}',  to: "" }
                ]
            },
            productionRoot: {
                src: ['./extension/express/public/views/root.html'],
                dest: ['./extension/express/public/views/root_built.html'],
                replacements: [ 
                    { from: '{{dynamicBust}}',  to: "\"" + new Date().getTime() + "\"" }, 
                    { from: '{{staticBust}}', to: new Date().getTime() + "" } 
                ]
            },
            productionApp: {
                src: ['./lib/extension/express/public/js/app.js'],
                overwrite:true,
                replacements: [
                    { from: '{{templateBust}}',  to: new Date().getTime() + "" }
                ]
            }
        },

        watch: {
            extensions: {
                files: ['**/main.js'],
                tasks: ['copy:dev']
            },
            root: {
                files: ['**/root.html'],
                tasks: ['replace:devRoot']
            },
            app: {
                files: ['**/app.js'],
                tasks: ['replace:devApp']
            }
        }
    });

    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-text-replace');
    grunt.loadNpmTasks('grunt-contrib-watch');

    //'mochaTest'
    grunt.registerTask('default', ['mochaTest:test']);

    grunt.registerTask('init', ['development', 'production', 'watch']);

    grunt.registerTask('development', ['copy:dev', 'replace:devRoot', 'replace:devApp']);
    grunt.registerTask('production', [ 'requirejs', 'replace:productionRoot', 'replace:productionApp']);

    grunt.registerTask('test-all', ['mochaTest:testAll']);
    grunt.registerTask('test-exact', ['mochaTest:testExact']);
};
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
        codemirror: "empty:",
        "core/basicModel": "empty:",
        "core/jaydataModel": "empty:",
        "core/codeMirrorBinder": "empty:",
        "core/view.base": "empty:",
        "core/dataGrid": "empty:",
        "jsrender.bootstrap": "empty:",
        "core/utils": "empty:",
        "core/listenerCollection": "empty:",
    };

    function extensionOptimization(name) {
        return {
            options: {
                paths: commonPath,
                baseUrl: "./extension/" + name + "/public/js",
                out: "extension/" + name + "/public/js/main.js",
                optimize: "none",
                name: "main_dev",
                onBuildWrite: function(moduleName, path, contents) {
                    var regExp = new RegExp("\"./", "g");
                    return contents.replace("define('main_dev',", "define(").replace(regExp, "\"");
                }
            }
        };
    };

    var extensions = ["express", "templates", "html", "phantom", "fop", "scripts", "data", "images", "examples", "statistics", "reports"];
    
    function copyFiles(mode) {
        var result = [];
        result.push({ src: ['./config/debug.' + mode + '.config.js'], dest: './config.js' });

        extensions.forEach(function(e) {
            result.push({
                src: "extension/" + e + "/public/js/main_dev.js",
                dest: "extension/" + e + "/public/js/main.js",
            });
        });

        return result;
    }

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        mocha_phantomjs: {
            test: {
                src: ['test/ui/tests.html'],
                run: true,
            },
        },
        mochaTest: {
            test: {
                src: ['extension/*/test/*.js', 'test/*.js']
                //src: ['test/ListenerCollectionTest.js']
                //src: ['extension/templates' + '/test/*.js']
            },
        },

        copy: {
            multitenantDebug: { files: copyFiles("multitenant")},
            multitenantProduction: { files: [{src: ['./config/production.multitenant.config.js'], dest: './config.js' }]},
            playgroundDebug: { files: copyFiles("playground")},
            playgroundProduction: { files: [{src: ['./config/production.playground.config.js'], dest: './config.js' }]},
        },

        requirejs: {
            compileApp: {
                options: {
                    baseUrl: "./extension/express/public/js",
                    mainConfigFile: './extension/express/public/js/require_main.js',
                    out: "extension/express/public/js/app.js",
                    // optimize: "none",
                    name: 'app_dev',
                    removeCombined: true,
                    //findNestedDependencies: true,
                    onBuildWrite: function(moduleName, path, contents) {
                        return contents.replace("define('app_dev',", "define(");
                    }
                }
            },

            compileTemplates: extensionOptimization("templates"),
            compileImages: extensionOptimization("images"),
            compileScripts: extensionOptimization("scripts"),
            compileData: extensionOptimization("data"),
            compileReports: extensionOptimization("reports"),
            compileStatistics: extensionOptimization("statistics"),
        }
    });


    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-mocha-phantomjs');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-copy');

    //'mochaTest'
    grunt.registerTask('default', ['mochaTest']);

    grunt.registerTask('deploy', ['requirejs']);
    
    grunt.registerTask('multitenant-debug', ['copy:multitenantDebug']);
    grunt.registerTask('multitenant-production', ['requirejs', 'copy:multitenantProduction']);
    
    grunt.registerTask('playground-debug', ['copy:playgroundDebug']);
    grunt.registerTask('playground-production', ['requirejs', 'copy:playgroundProduction']);
};
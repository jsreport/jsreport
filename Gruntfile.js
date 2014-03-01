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
                    var regExp = new RegExp("\"[.]/", "g");
                    return contents.replace("define('main_dev',", "define(").replace(regExp, "\"");
                }
            }
        };
    }

    ;

    var extensions = ["express", "templates", "html", "phantom-pdf", "fop", "scripts", "data", "images", "examples", "statistics", "reports"];

    function copyFiles(mode) {
        var result = [];
        result.push({ src: ['./config/debug.' + mode + '.config.js'], dest: './config.js' });

        result.push({ src: ['extension/express/public/js/app_dev.js'], dest: 'extension/express/public/js/app.js' });

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
                //src: ['test/gridFSTest.js', 'extension/reports' + '/test/*.js']
               //src: ['extension/childTemplates' + '/test/*.js']
            },
            testExact: {
                src: ['extension/examples/test/*.js']
            },
            testAll: {
                src: ['extension/*/test/*.js', 'test/*.js', 'extension/*/integrationTest/*.js']           
                //src: ['extension/templates/test/*.js']           
            }
        },

        copy: {
            multitenantDebug: { files: copyFiles("multitenant") },
            multitenantProduction: { files: [{ src: ['./config/production.multitenant.config.js'], dest: './config.js' }] },
            playgroundDebug: { files: copyFiles("playground") },
            playgroundProduction: { files: [{ src: ['./config/production.playground.config.js'], dest: './config.js' }] },
            standardDebug: { files: copyFiles("standard") },
            standardProduction: { files: [{ src: ['./config/production.standard.config.js'], dest: './config.js' }] },
            mfrDebug: { files: copyFiles("mfr") },
            mfrProduction: { files: [{ src: ['./config/production.mfr.config.js'], dest: './config.js' }] },
        },

        requirejs: {
            compileApp: {
                options: {
                    baseUrl: "./extension/express/public/js",
                    mainConfigFile: './extension/express/public/js/require_main.js',
                    out: "extension/express/public/js/app.js",
                    name: 'app_dev',
                    removeCombined: true,
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
          //  compilePhantom: extensionOptimization("phantom-pdf"),
        },
        
        replace: {
            debugRoot: {
                src: ['./extension/express/public/views/root_dev.html'],
                dest: ['./extension/express/public/views/root.html'],
                replacements: [ { from: '{{dynamicBust}}', to: "new Date().getTime()" },  { from: '{{staticBust}}', to: "" } ]
            },
            debugApp: {
               src: ['./extension/express/public/js/app.js'],
                overwrite:true,
                replacements: [ 
                    { from: '{{templateBust}}',  to: "" }, 
                ]
            },
            productionRoot: {
                src: ['./extension/express/public/views/root_dev.html'],
                dest: ['./extension/express/public/views/root.html'],
                replacements: [ 
                    { from: '{{dynamicBust}}',  to: "\"" + new Date().getTime() + "\"" }, 
                    { from: '{{staticBust}}', to: new Date().getTime() + "" } 
                ]
            },
            productionApp: {
                src: ['./extension/express/public/js/app.js'],
                overwrite:true,
                replacements: [ 
                    //temporary avoid template caching for designer
                    { from: '{{templateBust}}',  to: "" }, 
                    //{ from: '{{templateBust}}',  to: new Date().getTime() + "" }, 
                ]
            }
        }
    });


    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-mocha-phantomjs');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-text-replace');

    //'mochaTest'
    grunt.registerTask('default', ['mochaTest:test']);

    grunt.registerTask('deploy', ['requirejs']);

    grunt.registerTask('mfr-debug', ['copy:mfrDebug', 'replace:debugRoot', 'replace:debugApp']);
    grunt.registerTask('mfr-production', ['requirejs', 'copy:mfrProduction', 'replace:productionRoot', 'replace:productionApp']);

    grunt.registerTask('multitenant-debug', ['copy:multitenantDebug', 'replace:debugRoot', 'replace:debugApp']);
    grunt.registerTask('multitenant-production', ['requirejs', 'copy:multitenantProduction', 'replace:productionRoot', 'replace:productionApp']);

    grunt.registerTask('playground-debug', ['copy:playgroundDebug', 'replace:debugRoot', 'replace:debugApp']);
    grunt.registerTask('playground-production', ['requirejs', 'copy:playgroundProduction', 'replace:productionRoot', 'replace:productionApp']);
    
    grunt.registerTask('standard-debug', ['copy:standardDebug', 'replace:debugRoot', 'replace:debugApp']);
    grunt.registerTask('standard-production', ['requirejs', 'copy:standardProduction', 'replace:productionRoot', 'replace:productionApp']);

    grunt.registerTask('test-all', ['mochaTest:testAll']);
    grunt.registerTask('test-exact', ['mochaTest:testExact']);
};
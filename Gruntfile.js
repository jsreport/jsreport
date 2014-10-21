/*!
 * Task automation for jsreport
 *
 * grunt build # build, combine and minify files (production and development environment)
 * grunt build-dev # build just for development environment, this is important for changes in main.js files
 * grunt build-prod # build, combine and minify files
 * grunt watch-build # do the build-dev automatically when changes occure in main.js
 *
 * grunt test # start tests with file system based db (neDb), no mongo needed
 * grunt test-mongo # start tests with mongo db
 * grunt test-all # start tests with nedb and then once again with mongo (used with travis CI)
 * grunt test-integration # start all tests with nedb including integration tests including java fop and phantomjs
 */


module.exports = function (grunt) {
    var utils = require("./lib/util/util.js"),
        fs = require("fs"),
        path = require("path"),
        _ = require("underscore");


    var extensions = utils.walkSync(grunt.option('root') || __dirname, "jsreport.config.js", []).map(function (e) {
        return _.extend({ directory: path.dirname(e) }, require(e));
    });

    function createRequireJs() {

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
            introJs: "empty:",
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

        var result = {
            compileApp: {
                options: {
                    baseUrl: "./extension/express/public/js",
                    mainConfigFile: './extension/express/public/js/require_main.js',
                    out: "extension/express/public/js/app_built.js",
                    name: 'app',
                    removeCombined: true,
                    findNestedDependencies: true,
                    onBuildWrite: function (moduleName, path, contents) {
                        return contents.replace("define('app',", "define(");
                    }
                }
            }
        }

        extensions.forEach(function (e) {

            if (!fs.existsSync(path.join(e.directory, "public/js/main_dev.js"))) {
                return;
            }

            result[e.name] = {
                options: {
                    paths: commonPath,
                    baseUrl: path.join(e.directory, "public/js"),
                    out: path.join(e.directory, "/public/js/main.js"),
                    optimize: "none",
                    name: "main_dev",
                    onBuildWrite: function (moduleName, path, contents) {
                        var regExp = new RegExp("\"[.]/", "g");
                        return contents.replace("define('main_dev',", "define(").replace(regExp, "\"");
                    }
                }
            };
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
        env: {
            dbNedb: {
                DB: 'neDB'
            },
            dbMongo: {
                DB: 'mongo'
            }
        },
        mochaTest: {
            test: {
                options: {
                    clearRequireCache: true,
                    timeout: 5000
                },
                src: ['extension/*/test/*.js', 'test/*.js']
            },
            testExact: {
                options: {
                    clearRequireCache: true
                },
                src: ['extension/images/test/*.js']
            },
            integration: {
                options: {
                    clearRequireCache: true
                },
                src: ['extension/*/test/*.js', 'test/*.js', 'extension/*/integrationTest/*.js']
            }
        },

        copy: {
            dev: { files: [{ src: ['extension/express/public/js/app.js'], dest: 'extension/express/public/js/app_dev.js' }] }
        },

        requirejs: createRequireJs(),

        replace: {
            devRoot: {
                src: ['./extension/express/public/views/root.html'],
                dest: ['./extension/express/public/views/root_dev.html'],
                replacements: [
                    { from: '{{dynamicBust}}', to: "new Date().getTime()" },
                    { from: '{{staticBust}}', to: "" }
                ]
            },
            devApp: {
                src: ['./extension/express/public/js/app.js'],
                dest: ['./extension/express/public/js/app_dev.js'],
                replacements: [
                    { from: '{{templateBust}}', to: "" }
                ]
            },
            productionRoot: {
                src: ['./extension/express/public/views/root.html'],
                dest: ['./extension/express/public/views/root_built.html'],
                replacements: [
                    { from: '{{dynamicBust}}', to: "\"" + new Date().getTime() + "\"" },
                    { from: '{{staticBust}}', to: new Date().getTime() + "" }
                ]
            },
            productionApp: {
                src: ['./lib/extension/express/public/js/app.js'],
                overwrite: true,
                replacements: [
                    { from: '{{templateBust}}', to: new Date().getTime() + "" }
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
        },

        cssmin: {
            combine: {
                files: {
                    'extension/express/public/css/built.css': [
                        'extension/express/public/css/bootstrap.min.css', 'extension/express/public/css/bootstrap-nonresponsive.css',
                        'extension/express/public/css/toastr.css', 'extension/express/public/css/split-pane.css',
                        'extension/express/public/css/style.css', 'extension/express/public/css/introjs.css'
                    ]
                }
            }
        },

        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: ['extension/client-html/public/js/handlebars.min.js', 'extension/client-html/public/js/jsrender.min.js',
                    'extension/client-html/public/js/client.render.js', 'extension/embedding/public/embed.js'],
                dest: 'extension/embedding/public/embed.min.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-text-replace');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-env');

    grunt.registerTask('default', ['build']);

    grunt.registerTask('build', ['build-dev', 'build-prod']);

    grunt.registerTask('build-dev', ['copy:dev', 'replace:devRoot', 'replace:devApp', 'concat']);
    grunt.registerTask('build-prod', [ 'requirejs', 'cssmin', 'replace:productionRoot', 'replace:productionApp', 'concat']);

    grunt.registerTask('watch-build', ['watch']);

    grunt.registerTask('test-nedb', ['env:dbNedb', 'mochaTest:test']);
    grunt.registerTask('test-mongo', ['env:dbMongo', 'mochaTest:test']);
    grunt.registerTask('test', ['test-nedb']);

    grunt.registerTask('test-all', ['test-mongo', 'test-nedb']);
    grunt.registerTask('test-integration', ['env:dbNedb', 'mochaTest:integration']);
    grunt.registerTask('test-exact', ['env:dbMongo', 'mochaTest:testExact']);
};
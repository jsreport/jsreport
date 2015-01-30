/*!
 * Task automation for jsreport
 *
 * grunt build # build, combine and minify files (production and development environment)
 * grunt build-dev # build just for development environment, this is important for changes in main.js files
 * grunt build-prod # build, combine and minify files
 *
 * grunt test # start tests with file system based db (neDb), no mongo needed
 * grunt test-mongo # start tests with mongo db
 * grunt test-all # start tests with nedb and then once again with mongo (used with travis CI) ant then ui tests
 * grunt test-integration # start all tests with nedb including integration tests including java fop and phantomjs
 * grunt test-ui # start ui tests
 */


module.exports = function (grunt) {
    var utils = require("./lib/util/util.js"),
        fs = require("fs"),
        path = require("path"),
        _ = require("underscore"),
        S = require("string");


    var extensions = utils.walkSync(grunt.option('root') || __dirname, "jsreport.config.js", []).map(function (e) {
        return _.extend({ directory: path.dirname(e) }, require(e));
    });

    function writeHtmlTemplatesForUiTests() {
        var templatesContent = [];

        function collect(rootPath) {
            if (!fs.lstatSync(rootPath).isDirectory())
                return;

            var paths = fs.readdirSync(rootPath);

            paths.forEach(function(p) {
                if (p === "node_modules")
                    return;

                if (S(p).endsWith(".html") && path.basename(rootPath) === "templates") {
                    templatesContent.push({ name: p.replace(".html", ""), content: fs.readFileSync(path.join(rootPath, p), 'utf8')});
                } else {
                    collect(path.join(rootPath, p));
                }
            });
        }

        collect(__dirname);

        fs.writeFileSync(path.join(__dirname, "test", "ui", "html-templates.js"), "requests.templates = " + JSON.stringify(templatesContent, null, 2) + ";");
    }

    function createRequireJs() {

        var result = {};

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

        result["compileApp"] = {
            options: {
                baseUrl: "./extension/express/public/js",
                mainConfigFile: './extension/express/public/js/require_main_fixed.js',
                out: "./extension/express/public/js/app_built.js",
                name: 'app',
                removeCombined: true,
                findNestedDependencies: true,
                onBuildWrite: function (moduleName, path, contents) {
                    return contents.replace("define('app',", "define(");
                }
            }
        };

        function processExtension(e, studio) {
            if (!fs.existsSync(path.join(e.directory, "public/js/main_" + (studio ? studio + "_" : "") + "dev.js"))) {
                return;
            }

            result[e.name + studio] = {
                options: {
                    paths: commonPath,
                    baseUrl: path.join(e.directory, "public/js"),
                    out: path.join(e.directory, "/public/js/main" + (studio ? "_" + studio : "") + ".js"),
                    optimize: "none",
                    name: "main_" + (studio ? studio + "_" : "") + "dev",
                    onBuildWrite: function (moduleName, path, contents) {
                        var regExp = new RegExp("\"[.]/", "g");
                        return contents.replace("define('main_" + (studio ? studio + "_" : "") + "dev',", "define(").replace(regExp, "\"");
                    }
                }
            };
        }

        extensions.forEach(function (e) {
            processExtension(e, "");
            processExtension(e, "embed");
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
                src: ['extension/statistics/test/*.js']
            },
            integration: {
                options: {
                    clearRequireCache: true
                },
                src: ['extension/*/test/*.js', 'test/*.js', 'extension/*/integrationTest/*.js']
            }
        },

        copy: {
            dev: { files: [{ src: ['extension/express/public/js/app_dev.js'], dest: 'extension/express/public/js/app_built.js' }] }
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
            productionRoot: {
                src: ['./extension/express/public/views/root.html'],
                dest: ['./extension/express/public/views/root_built.html'],
                replacements: [
                    { from: '{{dynamicBust}}', to: "\"" + new Date().getTime() + "\"" },
                    { from: '{{staticBust}}', to: new Date().getTime() + "" }
                ]
            },
            requirejsMain: {
                src: ['./extension/express/public/js/require_main.js'],
                dest: ['./extension/express/public/js/require_main_fixed.js'],
                replacements: [
                    { from: 'jsreport_server_url + "js"', to: '"/js"' },
                    { from: 'jsreport_main_app', to: "'app_built'" }
                ]
            }
        },

        cssmin: {
            combine: {
                files: {
                    'extension/express/public/css/built.css': [
                        'extension/express/public/css/bootstrap.min.css', 'extension/express/public/css/bootstrap-nonresponsive.css',
                        'extension/express/public/css/toastr.css', 'extension/express/public/css/split-pane.css',
                        'extension/express/public/css/style.css', 'extension/express/public/css/introjs.css',
                        'extension/express/public/css/bootstrap-multiselect.css'
                    ],
                    'extension/express/public/css/built_embed.css': [
                        'extension/express/public/css/bootstrap.min.css', 'extension/express/public/css/bootstrap-nonresponsive.css',
                        'extension/express/public/css/toastr.css', 'extension/express/public/css/split-pane.css',
                        'extension/express/public/css/embed.css', 'extension/express/public/css/introjs.css'
                    ]
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-text-replace');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-env');
    grunt.loadNpmTasks('grunt-mocha-phantomjs');

    grunt.registerTask('default', ['build']);

    grunt.registerTask('writeHtmlTemplatesForUiTests', writeHtmlTemplatesForUiTests);

    grunt.registerTask('build', ['build-dev', 'build-prod']);

    grunt.registerTask('build-dev', ['copy:dev', 'replace:devRoot']);
    grunt.registerTask('build-prod', [ 'replace:requirejsMain', 'requirejs', 'cssmin', 'replace:productionRoot']);

    grunt.registerTask('test-nedb', ['env:dbNedb', 'mochaTest:test']);
    grunt.registerTask('test-mongo', ['env:dbMongo', 'mochaTest:test']);
    grunt.registerTask('test', ['test-nedb']);

    grunt.registerTask('test-all', ['test-mongo', 'test-nedb', 'test-ui']);
    grunt.registerTask('test-integration', ['env:dbNedb', 'mochaTest:integration']);
    grunt.registerTask('test-exact', ['env:dbNedb', 'mochaTest:testExact']);
    grunt.registerTask('test-ui', ['writeHtmlTemplatesForUiTests', 'mocha_phantomjs']);
};
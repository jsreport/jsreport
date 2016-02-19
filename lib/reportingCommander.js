/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * Evaluates commands from commandline and update accordinly initial config
 */

var fs = require('fs')
var path = require('path')
var platform = require('os').platform()
var childProcess = require('child_process')
var command = require('commander')

module.exports = function (options) {
  function install () {
    console.log('Platform is ' + platform)

    if (platform === 'win32' || platform === 'win64') {
      return windowsInstall()
    }

    console.log('Installing jsreport as startup service for your platform should be described at http://jsreport.net/downloads')
  }

  function windowsInstall () {
    console.log('installing windows service jsreport-server.')

    var pathToWinSer = path.join(__dirname, '../node_modules/.bin/winser.cmd')

    // support also flatten packages
    if (!fs.existsSync(pathToWinSer)) {
      pathToWinSer = path.join(__dirname, '../../.bin/winser.cmd')
    }

    pathToWinSer = '"' + pathToWinSer + '"'

    var env = ' --env NODE_ENV=' + process.env.NODE_ENV || 'development'

    childProcess.exec(pathToWinSer + ' -i ' + env, {cwd: path.dirname(require.main.filename)}, function (error, stdout, stderr) {
      if (error) {
        console.log(error)
        process.exit(1)
        return
      }

      console.log('starting windows service jsreport-server.')

      childProcess.exec('net start jsreport-server', function (error, stdout, stder) {
        if (error) {
          console.log(error)
          process.exit(1)
          return
        }

        var path = options.httpsPort ? ('https://localhost:' + options.httpsPort) : ('http://localhost:' + options.httpPort)
        console.log('service jsreport-server is running. go to ' + path)
        process.exit(0)
      })
    })
  }

  function windowsUninstall () {
    console.log('uninstalling windows service jsreport-server.')

    var pathToWinSer = path.join(__dirname, '../node_modules/.bin/winser.cmd')

    // support also flatten packages
    if (!fs.existsSync(pathToWinSer)) {
      pathToWinSer = path.join(__dirname, '../../.bin/winser.cmd')
    }

    pathToWinSer = '"' + pathToWinSer + '"'
    childProcess.exec(pathToWinSer + ' -r -x', {cwd: path.dirname(require.main.filename)}, function (error, stdout, stderr) {
      if (error) {
        console.log(error)
        process.exit(1)
        return
      }

      console.log('windows service jsreport-server uninstalled')
      process.exit(0)
    })
  }

  function daemon () {
    options.daemon = true
  }

  function render () {
    if (!options.render && !fs.existsFileSync(options.render)) {
      console.error('Value of --render must be a valid json file path')
      process.exit(-1)
    }

    options.connectionString = options.connectionString || {name: 'neDB'}
    options.blobStorage = options.blobStorage || 'fileSystem'
    options.logger = options.logger || {providerName: 'console'}

    options.render = fs.readFileSync(options.render)
    options.render = JSON.parse(options.render)
  }

  function template () {
    if (!options.template && !fs.existsFileSync(options.template)) {
      console.error('Value of --template must be a valid json file path')
      process.exit(-1)
    }

    options.template = fs.readFileSync(options.template)
    options.template = {template: JSON.parse(options.template)}
  }

  function output () {
    if (!options.output) {
      console.error('Value of --output must be a file path')
      process.exit(-1)
    }
  }

  // ignore errors so we can override configuration with nconf
  command.unknownOption = function (flag) {
  }

  command
    .version(require('./../package.json').version)
    .usage('[options]')
    .option('-r, --render', 'Invoke single rendering command and close. Example: jsreport.exe --render request.json --output report.pdf', render)
    .option('-t, --template', 'Use in combination with --render. Allows to add path to the stored report template.', template)
    .option('-o, --output', 'Output rendering into the file path', output)
    .option('-i, --install', 'WINDOWS ONLY - install app as windows service, For other platforms see http://jsreport.net/on-prem/downloads', install)
    .option('-r, --uninstall', 'WINDOWS ONLY - Stop and uninstall service', windowsUninstall)
    .option('-d, --daemon', 'NON WINDOWS ONLY - Start process as daemon', daemon)
    .parse(process.argv)

  if (options.template && !options.render) {
    console.error('--render value must be specified when the --template value is set')
    process.exit(-1)
  }

  if (options.render && !options.output) {
    console.error('--output value must be specified when the --render value is set')
    process.exit(-1)
  }
}

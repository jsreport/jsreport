
module.exports = ({ withReact = false, withTransformRuntime = false } = {}) => {
  const studioDev = require('.')
  const browserTargets = studioDev.browserTargets

  const presets = [
    [
      require.resolve('@babel/preset-env'),
      {
        targets: browserTargets,
        // we don't use browserslist: because we don't want our compilation to be modified
        // by some definition of browserslist somewhere
        ignoreBrowserslistConfig: true
      }
    ]
  ]

  const plugins = []

  if (withReact) {
    presets.push(require.resolve('@babel/preset-react'))
  }

  if (withTransformRuntime) {
    // we can technically enabled corejs 3 polyfills like .includes by passing
    // const babelRuntimeCoreVersion = studioDev.versions['@babel/runtime-corejs3']
    // {
    //   corejs: 3,
    //   version: babelRuntimeCoreVersion
    // }
    // as options, however we don't enable it because transform runtime does not let selectively
    // enable polyfills, and there is some polyfill for URL() that corejs 3 applies that causes
    // the webpack not able to handle web worker file
    // (like the linter.worker.js references from TextEditor in studio)
    plugins.push([
      require.resolve('@babel/plugin-transform-runtime')
    ])
  }

  return {
    // it is important to set the sourceType to unambiguous because we use a mix of ES6 and CommonJS,
    // this setting is what makes @babel/plugin-transform-runtime to decide if it should
    // use a require or a import for its module calls
    // https://babeljs.io/docs/options#sourcetype
    sourceType: 'unambiguous',
    presets,
    plugins
  }
}

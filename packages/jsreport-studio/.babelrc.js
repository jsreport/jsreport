const babelRuntimeCoreVersion = require('@jsreport/studio-dev').versions['@babel/runtime-corejs3']

module.exports = {
  // it is important to set the sourceType to unambiguous because we use a mix of ES6 and CommonJS,
  // this setting is what makes @babel/plugin-transform-runtime to decide if it should
  // use a require or a import for its module calls
  // https://babeljs.io/docs/options#sourcetype
  "sourceType": "unambiguous",
  "presets": [
    [
      require.resolve("@babel/preset-env"),
        {
          // we don't compile syntax that already works in browsers since 2020
          // this means that ES6/ES2015 JS versions should not need compilation and we just do it
          // for JSX and other modern syntax
          "targets": 'since 2020, > 0.5%, Firefox ESR, not dead',
          // we don't use browserslist: because we don't want our compilation to be modified
          // by some definition of browserslist somewhere
          "ignoreBrowserslistConfig": true
        }
    ],
    require.resolve("@babel/preset-react")
  ],

  "plugins": [
    [
      require.resolve("@babel/plugin-transform-runtime"),
      {
        "corejs": 3,
        "version": babelRuntimeCoreVersion
      }
    ]
  ]
}

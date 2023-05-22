
module.exports = () => ({
  module: {
    id: typeof module.id === 'string',
    path: typeof module.path === 'string',
    exports: typeof module.exports === 'function',
    filename: typeof module.filename === 'string',
    loaded: typeof module.loaded === 'boolean',
    children: Array.isArray(module.children),
    parent: Object.prototype.hasOwnProperty.call(module, 'parent'),
    isPreloading: typeof module.isPreloading === 'boolean',
    paths: Array.isArray(module.paths),
    require: typeof module.require === 'function'
  },
  require: {
    resolve: typeof require.resolve === 'function',
    'resolve.paths': typeof require.resolve.paths === 'function',
    main: require.main != null,
    // eslint-disable-next-line
    extensions: require.extensions != null,
    cache: require.cache != null
  }
})

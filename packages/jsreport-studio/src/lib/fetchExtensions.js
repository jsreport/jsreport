
export default function () {
  /* eslint-disable-next-line */
  if (__DEVELOPMENT__) {
    return Promise.all([
      import(/* webpackChunkName: "studio-extensions-static" */ '../extensions_dev.css'),
      import(/* webpackChunkName: "studio-extensions-live" */'../extensions_dev.js')
    ])
  }

  return import(
    /* webpackChunkName: "studio-extensions" */
    '../extensions.js'
  )
}

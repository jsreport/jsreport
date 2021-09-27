
module.exports = () => {
  return {
    compile: (html) => html,
    execute: (html, helpers) => {
      // the empty string there is because of async helpers test
      return '' + helpers.a(helpers)
    }
  }
}

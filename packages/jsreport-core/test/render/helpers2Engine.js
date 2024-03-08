
module.exports = () => {
  return {
    compile: (html) => html,
    execute: (html, helpers) => {
      return helpers.a1(helpers) + helpers.a2(helpers)
    }
  }
}

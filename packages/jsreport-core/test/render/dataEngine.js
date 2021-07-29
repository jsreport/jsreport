module.exports = () => {
  return {
    compile: (html) => html,
    execute: (html, helpers, data) => {
      return data.a.val
    }
  }
}

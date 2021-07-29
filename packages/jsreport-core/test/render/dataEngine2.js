module.exports = () => {
  return {
    compile: (html) => html,
    execute: (html, helpers, data) => {
      return JSON.stringify(data)
    }
  }
}

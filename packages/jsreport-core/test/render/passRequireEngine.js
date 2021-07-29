module.exports = (template, opts) => {
  return {
    compile: (html, { require }) => {
      return () => typeof require === 'function' ? `${html}_require` : html
    },
    execute: (templateSpec, helpers, data, { require }) => {
      const result = templateSpec()
      return typeof require === 'function' ? `${result}_complete` : result
    }
  }
}

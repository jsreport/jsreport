/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Engine running not templating engine compilation or rendering. Just return input html
 */

module.exports = () => {
  return {
    compile: (html) => html,
    execute: (html) => html
  }
}

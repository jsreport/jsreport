/* eslint-disable */
module.exports = () => {
  function stack () {
    new Error().stack;
    stack();
  }

  try {
    stack()
  } catch (e) {
    console.log(e.constructor.constructor("return process")())
  }
}

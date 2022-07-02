const { isPromise, isEmpty } = require('../utils')

module.exports = (handlebars) => {
  handlebars.registerHelper('with', async function (context, options) {
    if (arguments.length !== 2) {
      throw new Error('#with requires exactly one argument')
    }
    if (typeof context === 'function') {
      context = context.call(this)
    } else if (isPromise(context)) {
      context = await context
    }

    const fn = options.fn

    if (!isEmpty(context)) {
      const data = options.data

      return fn(context, {
        data: data,
        blockParams: [context]
      })
    } else {
      return options.inverse(this)
    }
  })
}

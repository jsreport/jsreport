const {
  createFrame, isPromise, isFunction
} = require('../utils')

module.exports = (handlebars) => {
  handlebars.registerHelper('each', async function (context, options) {
    if (!options) {
      throw new Error('Must pass iterator to #each')
    }

    const fn = options.fn
    const inverse = options.inverse
    let i = 0
    let ret = ''
    let data

    if (isFunction(context)) {
      context = context.call(this)
    }

    if (options.data) {
      data = createFrame(options.data)
    }

    async function execIteration (field, index, last) {
      if (data) {
        data.key = field
        data.index = index
        data.first = index === 0
        data.last = !!last
      }

      ret =
        ret +
        await fn(context[field], {
          data: data,
          blockParams: [context[field], field]
        })
    }

    if (context && typeof context === 'object') {
      if (isPromise(context)) {
        context = await context
      }

      if (Array.isArray(context)) {
        for (let j = context.length; i < j; i++) {
          if (i in context) {
            await execIteration(i, i, i === context.length - 1)
          }
        }
      } else if (typeof Symbol === 'function' && context[Symbol.iterator]) {
        const newContext = []
        const iterator = context[Symbol.iterator]()
        for (let it = iterator.next(); !it.done; it = iterator.next()) {
          newContext.push(it.value)
        }
        context = newContext
        for (let j = context.length; i < j; i++) {
          await execIteration(i, i, i === context.length - 1)
        }
      } else {
        let priorKey

        for (const key of Object.keys(context)) {
          // We're running the iterations one step out of sync so we can detect
          // the last iteration without have to scan the object twice and create
          // an intermediate keys array.
          if (priorKey !== undefined) {
            await execIteration(priorKey, i - 1)
          }
          priorKey = key
          i++
        }
        if (priorKey !== undefined) {
          await execIteration(priorKey, i - 1, true)
        }
      }
    }

    if (i === 0) {
      ret = inverse(this)
    }

    return ret
  })
}

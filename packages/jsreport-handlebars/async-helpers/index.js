// taken from https://github.com/gastonrobledo/handlebars-async-helpers

const { registerCoreHelpers } = require('./helpers')

function asyncHelpers (hbs) {
  const handlebars = hbs.create()

  const asyncCompiler = class extends hbs.JavaScriptCompiler {
    constructor () {
      super()
      this.compiler = asyncCompiler
    }

    mergeSource (varDeclarations) {
      const sources = super.mergeSource(varDeclarations)
      return sources.prepend('return (async () => {').add(' })()')
    }

    appendToBuffer (source, location, explicit) {
      // Force a source as this simplifies the merge logic.
      if (!Array.isArray(source)) {
        source = [source]
      }
      source = this.source.wrap(source, location)

      if (this.environment.isSimple) {
        return ['return await ', source, ';']
      } if (explicit) {
        // This is a case where the buffer operation occurs as a child of another
        // construct, generally braces. We have to explicitly output these buffer
        // operations to ensure that the emitted code goes in the correct location.
        return ['buffer += await ', source, ';']
      }
      source.appendToBuffer = true
      source.prepend('await ')
      return source
    }

    // this is important to escape only after the promise is resovled
    appendEscaped () {
      this.pushSource(this.appendToBuffer([this.aliasable('container.escapeExpression'), '(', 'await ', this.popStack(), ')']))
    }
  }
  handlebars.JavaScriptCompiler = asyncCompiler

  const _compile = handlebars.compile
  const _template = handlebars.VM.template
  handlebars.wrapHelperResult = (p) => p
  handlebars.template = function (spec) {
    spec.main_d = (prog, props, container, depth, data, blockParams, depths) => async (context) => {
      const originalFn = container.fn
      container.fn = (...args) => {
        const rf = originalFn(...args)
        return (...args2) => {
          const result = rf(...args2)
          return handlebars.wrapHelperResult(result)
        }
      }

      // here I've changed the last param from `depths` to `[context]`. This was needed to make the ../gotoparent working
      const v = spec.main(container, context, container.helpers, container.partials, data, blockParams, [context])
      // result can be actually SafeString
      return v.then((r) => r.toString())
    }
    return _template(spec, handlebars)
  }

  handlebars.compile = function (template, options) {
    const compiled = _compile.apply(handlebars, [template, { ...options, noEscape: true }])

    return function (context, execOptions) {
      context = context || {}

      return compiled.call(handlebars, context, execOptions)
    }
  }

  registerCoreHelpers(handlebars)
  handlebars.asyncHelpers = true

  return handlebars
}

module.exports = asyncHelpers

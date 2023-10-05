const extend = require('node.extend.without.arrays')
const set = require('set-value')
const hasOwn = require('has-own-deep')
const unsetValue = require('unset-value')
const ms = require('ms')
const bytes = require('bytes')
const Ajv = require('ajv')

const validatorCollection = new WeakMap()

class SchemaValidator {
  constructor (_options = {}) {
    const options = Object.assign({
      rootSchema: null
    }, _options)

    this.schemaVersion = 'http://json-schema.org/draft-07/schema#'

    const validator = new Ajv({
      useDefaults: true,
      coerceTypes: true,
      format: 'full'
    })

    const stringDateFormatValidate = validator.compile({ type: 'string', format: 'date-time' })

    validator.addKeyword('$jsreport-constantOrArray', {
      type: 'string',
      modifying: true,
      compile: (sch) => {
        if (!Array.isArray(sch)) {
          throw new Error('$jsreport-constantOrArray json schema keyword should contain an array')
        }

        return (data, dataPath, parentData, parentDataProperty) => {
          if (sch.indexOf(data) !== -1) {
            parentData[parentDataProperty] = data
            return true
          }

          parentData[parentDataProperty] = data.split(',')
          return true
        }
      }
    })

    validator.addKeyword('$jsreport-stringToDate', {
      modifying: true,
      compile: (sch) => {
        if (sch !== true) {
          return () => true
        }

        return (data, dataPath, parentData, parentDataProperty) => {
          if (!stringDateFormatValidate(data)) {
            return false
          }

          const newData = new Date(data)

          // tests that date instance is not invalid
          if (Object.prototype.toString.call(newData) !== '[object Date]') {
            return false
          }

          parentData[parentDataProperty] = newData

          return true
        }
      }
    })

    validator.addKeyword('$jsreport-acceptsDate', {
      compile: (sch) => {
        if (sch !== true) {
          return () => true
        }

        return (data) => {
          return Boolean(
            data &&
            Object.prototype.toString.call(data) === '[object Date]' &&
            !isNaN(data)
          )
        }
      }
    })

    validator.addKeyword('$jsreport-acceptsBuffer', {
      compile: (sch) => {
        if (sch !== true) {
          return () => true
        }

        return (data) => {
          return Buffer.isBuffer(data)
        }
      }
    })

    validator.addKeyword('$jsreport-acceptsDuration', {
      modifying: true,
      compile: (sch) => {
        if (sch !== true) {
          return () => true
        }

        return (data, dataPath, parentData, parentDataProperty) => {
          if (typeof data !== 'string' && typeof data !== 'number') {
            return false
          }

          if (typeof data === 'number') {
            return true
          }

          const newData = ms(data)

          if (newData == null) {
            return false
          }

          parentData[parentDataProperty] = newData

          return true
        }
      }
    })

    validator.addKeyword('$jsreport-acceptsSize', {
      modifying: true,
      compile: (sch) => {
        if (sch !== true) {
          return () => true
        }

        return (data, dataPath, parentData, parentDataProperty) => {
          if (typeof data !== 'string' && typeof data !== 'number') {
            return false
          }

          if (typeof data === 'number') {
            return true
          }

          const newData = bytes(data)

          if (newData == null) {
            return false
          }

          parentData[parentDataProperty] = newData

          return true
        }
      }
    })

    let rootValidate

    if (options.rootSchema != null) {
      rootValidate = validator.compile(addDefaultsAndValidateRootSchema(
        validator,
        options.rootSchema,
        this.schemaVersion
      ))

      this.setRootSchema = (schema) => {
        rootValidate = validator.compile(addDefaultsAndValidateRootSchema(
          validator,
          schema,
          this.schemaVersion
        ))
      }

      this.getRootSchema = () => rootValidate && rootValidate.schema

      this.validateRoot = (data, { rootPrefix = '', ignore = [] } = {}) => {
        let validateFn

        if (ignore.length > 0) {
          const newRootSchema = extend(true, {}, this.getRootSchema())

          ignore.forEach((prop) => {
            if (hasOwn(newRootSchema, prop)) {
              set(newRootSchema, prop, true)
              unsetValue(newRootSchema, prop)
            }
          })

          validateFn = validator.compile(newRootSchema)
        } else {
          validateFn = rootValidate
        }

        return runSchemaValidation(validator, validateFn, data, rootPrefix)
      }
    }

    validatorCollection.set(this, validator)
  }

  addSchema (name, _schema, replace = false) {
    const validator = validatorCollection.get(this)
    let schema = _schema

    if (typeof schema === 'object' && !Array.isArray(schema) && schema.$schema == null) {
      schema = Object.assign({}, schema, { $schema: this.schemaVersion })
    }

    if (replace === true && validator.getSchema(name) != null) {
      validator.removeSchema(name)
    }

    validator.addSchema(schema, name)
  }

  // after validate, data will be coerced (modified) with value types
  // that match the schema
  validate (name, data, { rootPrefix = '' } = {}) {
    const validator = validatorCollection.get(this)
    const schemaValidate = validator.getSchema(name)

    if (schemaValidate == null) {
      throw new Error(`schema ${name} is not registered in validator`)
    }

    return runSchemaValidation(validator, schemaValidate, data, rootPrefix)
  }

  getSchema (name) {
    const validator = validatorCollection.get(this)
    const schemaValidate = validator.getSchema(name)
    return schemaValidate ? schemaValidate.schema : undefined
  }
}

function addDefaultsAndValidateRootSchema (validator, _rootSchema, schemaVersion) {
  let rootSchema = _rootSchema

  if (
    typeof schema === 'object' &&
    !Array.isArray(rootSchema) &&
    rootSchema.$schema == null
  ) {
    rootSchema = Object.assign({}, rootSchema, { $schema: schemaVersion })
  }

  const schemaValid = validator.validateSchema(rootSchema)

  if (!schemaValid) {
    throw new Error(`root schema is not valid. errors: ${
      validator.errorsText(validator.errors, { dataVar: 'rootSchema' })
    }`)
  }

  return rootSchema
}

function runSchemaValidation (validator, schemaValidate, data, rootPrefix) {
  const valid = schemaValidate(data)
  const result = { valid }

  if (!valid) {
    result.errors = schemaValidate.errors.map((err) => {
      if (err.keyword === 'enum' && err.params && Array.isArray(err.params.allowedValues)) {
        // ajv errorsText does not put allowed values in message, we need to add it manually
        err.message += `. allowed values: [${err.params.allowedValues.map(v => JSON.stringify(v)).join(', ')}]`
      }

      return err
    })

    result.fullErrorMessage = `schema validation errors: ${
      validator.errorsText(result.errors, { dataVar: rootPrefix })
    }`
  }

  return result
}

module.exports = SchemaValidator

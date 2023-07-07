import { useState, useEffect, useMemo } from 'react'
import TextEditor from '../Editor/TextEditor'
import { values as configuration } from '../../lib/configuration'
import storeMethods from '../../redux/methods'
import api from '../../helpers/api'
import rootUrl from '../../helpers/rootUrl'
import styles from './EntityDefinitionModal.css'

function EntityDefinitionModal ({ close, options }) {
  const { entity } = options

  const [entityDefinition, setEntityDefinition] = useState(() => {
    return (entity.__isLoaded || entity.__isNew) ? getEntityDefinition(entity) : null
  })

  const [odataCollapsed, setOdataCollapsed] = useState(true)
  const [entitySetSchema, setEntitySetSchema] = useState(null)
  const entitySetSchemaText = useMemo(() => getJsonWithSchemaText(entitySetSchema), [entitySetSchema])
  const singleEntitySetName = configuration.entitySets[entity.__entitySet].visibleName

  useEffect(() => {
    if (entityDefinition == null) {
      api.get(`/odata/${entity.__entitySet}(${entity._id})`).then((response) => {
        const fetchedEntity = response.value[0]
        setEntityDefinition(getEntityDefinition(fetchedEntity))
      }).catch((err) => {
        console.error(`Error while getting entity definition for "${entity._id}"`, err)
      })
    }

    api.get(`/api/schema/${entity.__entitySet}`).then((response) => {
      setEntitySetSchema(response)
    }).catch((err) => {
      console.error(`Error while getting schema for entitySet "${entity.__entitySet}"`, err)
    })
  }, [])

  let body

  if (entityDefinition == null) {
    body = (
      <span>Loading entity <i className='fa fa-circle-o-notch fa-spin' style={{ display: 'inline-block' }} /></span>
    )
  } else {
    body = (
      <TextEditor
        key={entity._id}
        name={`${entity.name}_entityDefinition`}
        getFilename={() => entity.name}
        mode='json'
        onUpdate={() => {}}
        value={entityDefinition}
        readOnly
      />
    )
  }

  return (
    <div className={styles.container}>
      <h3>{singleEntitySetName} Definition</h3>
      <p>{storeMethods.resolveEntityPath(entity)}</p>
      <div className={styles.jsonContainer}>
        {body}
      </div>
      <div>
        <h3
          style={{ display: 'inline-block', cursor: 'pointer' }}
          onClick={() => setOdataCollapsed((collapsed) => !collapsed)}
        >
          <i className={`fa ${odataCollapsed ? 'fa-caret-right' : 'fa-caret-down'}`} /> http api
        </h3>
        <div style={{ display: odataCollapsed ? 'none' : 'block' }}>
          <div style={{ listStyle: 'none', paddingLeft: '5px', maxHeight: '220px', overflow: 'auto' }}>
            <div>
              <i className='fa fa-plus' /> Create {singleEntitySetName}
              <blockquote className={styles.blockquote}>
                <div>
                  <div className={styles.limitText}>
                    <code>POST:</code>&nbsp;
                    <a href={`${rootUrl()}/odata/${entity.__entitySet}`} target='_blank' rel='noreferrer'>{`${rootUrl()}/odata/${entity.__entitySet}`}</a>
                  </div>
                  <div>
                    <code>HEADERS:</code>&nbsp;
                    <span>Content-Type: application/json</span>
                  </div>
                </div>
                <div>
                  <code>BODY:</code>
                  <span>(check the schema bellow for a description of all of the valid properties)</span>
                  <pre className={styles.codeText}>{entitySetSchemaText}</pre>
                </div>
              </blockquote>
            </div>
            <div>
              <i className='fa fa-eye' /> Read {singleEntitySetName}
              <blockquote className={styles.blockquote}>
                <div>
                  <div className={styles.limitText}>
                    <code>GET:</code>&nbsp;
                    <a href={`${rootUrl()}/odata/${entity.__entitySet}(${entity._id})`} target='_blank' rel='noreferrer'>{`${rootUrl()}/odata/${entity.__entitySet}(${entity._id})`}</a>
                  </div>
                </div>
              </blockquote>
            </div>
            <div>
              <i className='fa fa-pencil' /> Update {singleEntitySetName}
              <blockquote className={styles.blockquote}>
                <div>
                  <div className={styles.limitText}>
                    <code>PATCH:</code>&nbsp;
                    <a href={`${rootUrl()}/odata/${entity.__entitySet}(${entity._id})`} target='_blank' rel='noreferrer'>{`${rootUrl()}/odata/${entity.__entitySet}(${entity._id})`}</a>
                  </div>
                  <div>
                    <code>HEADERS:</code>&nbsp;
                    <span>Content-Type: application/json</span>
                  </div>
                </div>
                <div>
                  <code>BODY:</code>&nbsp;
                  <span>(send the properties that you want to change)</span>
                  <pre className={styles.codeText}>
                    {JSON.stringify({ name: '<string>' }, null, 2)}
                  </pre>
                </div>
              </blockquote>
            </div>
            <div>
              <i className='fa fa-trash' /> Delete {singleEntitySetName}
              <blockquote className={styles.blockquote}>
                <div>
                  <div className={styles.limitText}>
                    <code>DELETE:</code>&nbsp;
                    <a href={`${rootUrl()}/odata/${entity.__entitySet}(${entity._id})`} target='_blank' rel='noreferrer'>{`${rootUrl()}/odata/${entity.__entitySet}(${entity._id})`}</a>
                  </div>
                </div>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
      <div className='button-bar'>
        <button className='button confirmation' onClick={() => close()}>Ok</button>
      </div>
    </div>
  )
}

function getEntityDefinition (entity) {
  return JSON.stringify(pruneEntity(entity), null, 2)
}

function getJsonWithSchemaText (schema) {
  if (schema == null) {
    return
  }

  return `{\n${printProperties(schema.properties)}}`
}

function printProperties (props, {
  level = 1
} = {}) {
  if (props == null) {
    return ''
  }

  const propsKeys = Array.isArray(props) ? props : Object.keys(props)
  const totalKeys = propsKeys.length
  const chunks = []

  const applyIndent = (text, level) => {
    let indent = ''

    for (let i = 0; i < level * 2; i++) {
      indent += ' '
    }

    return indent + text
  }

  propsKeys.forEach((key, index) => {
    const isLastKey = index === totalKeys - 1
    let propName
    let schema
    let customCase

    if (Array.isArray(key)) {
      propName = key[0]
      schema = key[1]
    } else {
      propName = key
      schema = props[propName]
    }

    let text = applyIndent('', level)

    if (propName !== '') {
      text += `"${propName}":`
    } else {
      text += '-'
    }

    if (schema.type) {
      let type = schema.type

      if (Array.isArray(type)) {
        type = type.join(' | ')
      } else if (type === 'array' && schema.items && schema.items.type) {
        type = Array.isArray(schema.items.type) ? schema.items.type.join(' | ') : schema.items.type
        type = `array<${type}>`
      }

      text += ` <${type}>`
    } else {
      if (schema.not != null && typeof schema.not === 'object') {
        text += ' <any type that is not valid against the description below>'
        customCase = 'not'
      } else if (Array.isArray(schema.anyOf)) {
        text += ' <any type that is valid against at least with one of the descriptions below>'
        customCase = 'anyOf'
      } else if (Array.isArray(schema.allOf)) {
        text += ' <any type that is valid against all the descriptions below>'
        customCase = 'allOf'
      } else if (Array.isArray(schema.oneOf)) {
        text += ' <any type that is valid against just one of the descriptions below>'
        customCase = 'oneOf'
      } else if (schema.description != null) {
        text += ' <any>'
      } else {
        let identified = false
        if (Object.keys(schema).length === 1) {
          if (typeof schema['$jsreport-acceptsBuffer'] !== 'undefined') {
            identified = true
            text = ''
          } else if (typeof schema['$jsreport-acceptsDate'] !== 'undefined') {
            identified = true
            text = ''
          } else if (typeof schema['$jsreport-stringToDate'] !== 'undefined') {
            identified = true
            text += ' <date as string>'
          }
        }

        if (!identified) {
          // only schemas structures that are not implemented gets printed in raw form,
          // this means that we should analyze the raw schema printed and then support it
          text += ` <raw schema: ${JSON.stringify(schema)}>`
        }
      }
    }

    let allowed

    if (schema.enum != null) {
      allowed = schema.enum
    } else if (schema.type === 'string' && schema['$jsreport-constantOrArray'] != null) {
      allowed = schema['$jsreport-constantOrArray']
    }

    if (Array.isArray(allowed) && allowed.length > 0) {
      text += ` (allowed values: ${allowed.map((value) => {
        return JSON.stringify(value)
      }).join(', ')})`
    }

    if (
      typeof schema.type === 'string' ||
      (Array.isArray(schema.type) && schema.type.indexOf('string') !== -1)
    ) {
      if (schema.format != null) {
        text += ` (format: ${schema.format})`
      }

      if (schema.pattern != null) {
        text += ` (pattern: ${schema.pattern})`
      }
    }

    if (schema.description != null) {
      text += ` -> ${schema.description}`
    }

    if (
      (
        schema.type === 'object' ||
        (
          Array.isArray(schema.type) &&
          schema.type.length === 2 &&
          schema.type.indexOf('object') !== -1 &&
          schema.type.indexOf('null') !== -1
        )
      ) &&
      schema.properties != null &&
      Object.keys(schema.properties).length > 0
    ) {
      text += ' {'
    } else if (
      schema.type === 'array' &&
      (Array.isArray(schema.items) ||
      (schema.items &&
      schema.items.type &&
      schema.items.type === 'object' &&
      schema.items.properties != null &&
      Object.keys(schema.items.properties).length > 0))
    ) {
      text += ' ['
    } else if (!isLastKey && propName !== '') {
      text += ','
    }

    text += '\n'

    if (customCase != null) {
      if (customCase === 'not') {
        text += printProperties([['', schema.not]], { level: level + 1 })
      } else if (
        (customCase === 'anyOf' ||
        customCase === 'allOf' ||
        customCase === 'oneOf') &&
        Array.isArray(schema[customCase]) &&
        schema[customCase].length > 0
      ) {
        text += printProperties(schema[customCase].map((s) => {
          return ['', s]
        }), { level: level + 1 })
      }
    } else if (
      (
        schema.type === 'object' ||
        (
          Array.isArray(schema.type) &&
          schema.type.length === 2 &&
          schema.type.indexOf('object') !== -1 &&
          schema.type.indexOf('null') !== -1
        )
      ) &&
      schema.properties != null &&
      Object.keys(schema.properties).length > 0
    ) {
      text += printProperties(schema.properties, {
        level: level + 1
      })

      text += applyIndent(`}${!isLastKey ? ',' : ''}`, level) + '\n'
    } else if (
      schema.type === 'array' &&
      schema.items &&
      schema.items.type === 'object' &&
      schema.items.properties != null &&
      Object.keys(schema.items.properties).length > 0
    ) {
      text += `${applyIndent('{', level + 1)}\n`

      text += printProperties(schema.items.properties, {
        level: level + 2
      })

      text += `${applyIndent('}', level + 1)}\n`
      text += applyIndent(`]${!isLastKey ? ',' : ''}`, level) + '\n'
    } else if (schema.type === 'array' && Array.isArray(schema.items)) {
      text += printProperties(schema.items.map((s, idx) => {
        return [`item at ${idx} index should be`, s]
      }), { level: level + 1 })

      text += applyIndent(`]${!isLastKey ? ',' : ''}`, level) + '\n'
    }

    chunks.push(text)
  })

  return chunks.join('')
}

function pruneEntity (entity) {
  return Object.keys(entity).reduce((acu, propName) => {
    if (propName.indexOf('__') !== 0) {
      acu[propName] = entity[propName]
    }

    return acu
  }, {})
}

export default EntityDefinitionModal

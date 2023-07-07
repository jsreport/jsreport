import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import TemplateWizard from '../TemplateWizard/TemplateWizard'
import { officeRecipes, getAttributeForRecipe as getOfficeAttributeForRecipe } from '../TemplateWizard/OfficeTemplateStep'
import { actions as editorActions } from '../../redux/editor'
import { actions as entitiesActions } from '../../redux/entities'
import api from '../../helpers/api.js'
import { values as configuration } from '../../lib/configuration'

class NewTemplateModal extends Component {
  constructor (props) {
    super(props)

    this.state = {
      templateName: '',
      error: null
    }

    this.handleTemplateWizardChange = this.handleTemplateWizardChange.bind(this)
    this.handleTemplateWizardValidation = this.handleTemplateWizardValidation.bind(this)
    this.handleTemplateSave = this.handleTemplateSave.bind(this)
  }

  getDefaultsForTemplate () {
    let entity = Object.assign({
      name: this.props.options.initialName,
      engine: getDefaultEngine(),
      recipe: getDefaultRecipe()
    }, this.props.options.entity)

    if (this.props.options.defaults != null) {
      entity = Object.assign(this.props.options.defaults, entity)
    }

    return entity
  }

  handleTemplateWizardChange (activeStep, template) {
    if (this.state.templateName !== template.name) {
      this.setState({
        templateName: template.name
      })
    }
  }

  handleTemplateWizardValidation (activeStep, template) {
    if (activeStep === 'basic') {
      return api.post('/studio/validate-entity-name', {
        data: {
          _id: this.props.options.cloning === true ? undefined : template._id,
          name: template.name,
          entitySet: 'templates',
          folderShortid: template.folder != null ? template.folder.shortid : null
        }
      }).then(() => {
        this.setState({
          error: null
        })
      })
    }
  }

  async handleTemplateSave (template, setProcessing) {
    this.setState({
      error: null
    })

    setProcessing(true)

    const creatingData = (
      template.data &&
      template.data.name != null &&
      template.data.name !== '' &&
      template.data.shortid == null
    )

    const creatingOfficeTemplate = (
      officeRecipes.includes(template.recipe) &&
      template[getOfficeAttributeForRecipe(template.recipe).attrName] != null &&
      template[getOfficeAttributeForRecipe(template.recipe).attrName].file != null &&
      template[getOfficeAttributeForRecipe(template.recipe).attrName][getOfficeAttributeForRecipe(template.recipe).shortidAttrName] == null
    )

    if (creatingData) {
      try {
        await api.post('/studio/validate-entity-name', {
          data: {
            _id: undefined,
            name: template.data.name,
            entitySet: 'data',
            folderShortid: template.folder != null ? template.folder.shortid : null
          }
        })
      } catch (e) {
        setProcessing(false)

        this.setState({
          error: `Data validation error: ${e.message}`
        })

        return
      }
    }

    let newOfficeTemplate

    if (creatingOfficeTemplate) {
      const officeTemplateFile = template[getOfficeAttributeForRecipe(template.recipe).attrName].file

      try {
        await new Promise((resolve, reject) => {
          const reader = new FileReader()

          reader.onloadend = async () => {
            const asset = {
              name: officeTemplateFile.name,
              content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length),
              folder: template.folder
            }

            try {
              const response = await api.post('/odata/assets', {
                data: asset
              })

              response.__entitySet = 'assets'

              newOfficeTemplate = Object.assign({}, response)

              this.props.addExisting(newOfficeTemplate)

              resolve()
            } catch (e) {
              reject(e)
            }
          }

          reader.onerror = function () {
            const errMsg = 'There was an error reading the office template file!'
            reject(new Error(errMsg))
          }

          reader.readAsDataURL(officeTemplateFile)
        })
      } catch (e) {
        setProcessing(false)

        this.setState({
          error: `Office template creation error: ${e.message}`
        })

        return
      }
    }

    if (creatingOfficeTemplate && newOfficeTemplate) {
      template[getOfficeAttributeForRecipe(template.recipe).attrName] = {
        [getOfficeAttributeForRecipe(template.recipe).shortidAttrName]: newOfficeTemplate.shortid
      }

      await this.props.openTab(newOfficeTemplate, this.props.options.activateNewTab)
    }

    if (creatingData) {
      const newData = await this.props.openNewTab({
        entity: Object.assign({}, template.data, { folder: template.folder }),
        entitySet: 'data',
        name: template.data.name
      }, this.props.options.activateNewTab)

      template.data = { shortid: newData.shortid }
    }

    const newEntity = await this.props.openNewTab({
      entity: template,
      entitySet: 'templates',
      name: template.name
    }, this.props.options.activateNewTab)

    if (this.props.options.onNewEntity) {
      this.props.options.onNewEntity(newEntity)
    }

    this.props.close()
  }

  render () {
    const entitySet = configuration.entitySets.templates
    const { templateName, error } = this.state

    return (
      <div>
        <div>
          <label>New {entitySet.visibleName}{templateName != null && templateName !== '' ? ` (${templateName})` : ''}</label>
        </div>
        <div className='form-group' style={{ marginLeft: '0px', marginRight: '0px' }}>
          <span style={{ color: 'red', display: error ? 'block' : 'none' }}>{error}</span>
        </div>
        <TemplateWizard
          defaults={this.getDefaultsForTemplate()}
          onChange={this.handleTemplateWizardChange}
          onValidate={this.handleTemplateWizardValidation}
          onError={(e) => this.setState({ error: `Template validation error: ${e.message}` })}
          onSave={this.handleTemplateSave}
        />
      </div>
    )
  }
}

NewTemplateModal.propTypes = {
  close: PropTypes.func.isRequired,
  options: PropTypes.object.isRequired
}

function getDefaultEngine () {
  const found = configuration.engines.find((e) => e === 'handlebars')

  if (found) {
    return found
  }

  return configuration.engines[0]
}

function getDefaultRecipe () {
  const found = configuration.recipes.find((e) => e === 'chrome-pdf')

  if (found) {
    return found
  }

  return configuration.recipes[0]
}

export default connect(
  undefined,
  { ...editorActions, ...entitiesActions }
)(NewTemplateModal)

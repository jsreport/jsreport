import OfficePasswordTemplateProperties from './OfficePasswordTemplateProperties'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent(OfficePasswordTemplateProperties.title, OfficePasswordTemplateProperties, (entity) => {
  return (
    entity.__entitySet === 'templates' &&
    ['docx', 'xlsx', 'pptx'].some((documentType) => {
      return entity.recipe.includes(documentType)
    })
  )
})

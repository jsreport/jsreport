import StaticPdfTemplateProperties from './StaticPdfTemplateProperties'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent(
  StaticPdfTemplateProperties.title,
  StaticPdfTemplateProperties,
  (entity) => entity.__entitySet === 'templates' && entity.recipe === 'static-pdf'
)

Studio.entityEditorComponentKeyResolvers.push((entity) => {
  if (entity.__entitySet === 'templates' && entity.recipe === 'static-pdf') {
    let pdfAsset

    if (entity.staticPdf != null && entity.staticPdf.pdfAssetShortid != null) {
      pdfAsset = Studio.getEntityByShortid(entity.staticPdf.pdfAssetShortid, false)
    }

    return {
      key: 'assets',
      entity: pdfAsset,
      props: {
        icon: 'fa-link',
        embeddingCode: '',
        displayName: `pdf asset: ${pdfAsset != null ? pdfAsset.name : '<none>'}`,
        emptyMessage: 'No pdf asset assigned, please add a reference to a pdf asset in the properties'
      }
    }
  }
})

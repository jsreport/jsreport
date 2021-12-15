
module.exports = async function componentPreview (data, reporter, req) {
  const entity = data.component
  const inputData = data.data

  const evaluateReq = reporter.Request(req)
  evaluateReq.context.id = `cp-${reporter.generateRequestId()}`
  evaluateReq.template.content = entity.content
  evaluateReq.template.engine = entity.engine
  evaluateReq.template.helpers = ''
  evaluateReq.template.recipe = 'html'

  const result = await reporter.templatingEngines.evaluate({
    engine: entity.engine,
    content: entity.content,
    helpers: entity.helpers,
    data: inputData
  }, {
    entity,
    entitySet: 'components'
  }, evaluateReq)

  return result
}

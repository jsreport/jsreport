const { applyPatches } = require('./patches')

module.exports = async function scriptApplyPatchesProcessing ({ versions, documentModel }, reporter, req) {
  const state = await applyPatches(versions, documentModel, reporter, req)

  return {
    state
  }
}

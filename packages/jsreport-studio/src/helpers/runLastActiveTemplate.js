import storeMethods from '../redux/methods'

async function runLastActiveTemplate (opts = {}) {
  storeMethods.progressStart()

  const params = {}
  const optsToUse = { ...opts }

  if (optsToUse.target === 'download') {
    params.options = {
      preview: false
    }
  }

  try {
    await storeMethods.run(params, optsToUse)
  } finally {
    storeMethods.progressStop()
  }
}

export default runLastActiveTemplate

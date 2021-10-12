import storeMethods from '../redux/methods'

async function runLastActiveTemplate (targetOrProfiling) {
  storeMethods.progressStart()

  const params = {}
  const opts = {}

  if (typeof targetOrProfiling === 'string') {
    opts.target = targetOrProfiling

    if (opts.target === 'download') {
      params.options = {
        preview: false
      }
    }
  } else if (typeof targetOrProfiling === 'boolean') {
    opts.profiling = targetOrProfiling
  } else {
    opts.profiling = true
  }

  try {
    await storeMethods.run(params, opts)
  } finally {
    storeMethods.progressStop()
  }
}

export default runLastActiveTemplate

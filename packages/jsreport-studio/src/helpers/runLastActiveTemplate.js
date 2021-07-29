import storeMethods from '../redux/methods'

async function runLastActiveTemplate (profiling = true) {
  storeMethods.progressStart()

  try {
    await storeMethods.run({}, { profiling })
  } finally {
    storeMethods.progressStop()
  }
}

export default runLastActiveTemplate

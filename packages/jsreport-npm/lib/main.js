const path = require('path')
const fs = require('fs').promises

module.exports = async (reporter, definition) => {
  await fs.mkdir(path.join(reporter.options.tempDirectory, 'npm'), { recursive: true })
}

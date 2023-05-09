process.title = 'render client'

async function many () {
  const args = process.argv.slice(2)
  const amountOfRequestsToExecute = args[0] ? parseInt(args[0], 10) : 1000000000
  const mode = args[1] || 'jsreport'

  if (isNaN(amountOfRequestsToExecute)) {
    console.error('the first arg (amount of requests) passed must be an integer')
    process.exit(1)
  }

  console.log(`Will execute ${amountOfRequestsToExecute} request(s) to ${mode}..`)

  for (let i = 0; i < amountOfRequestsToExecute; i++) {
    await execute(mode)
    console.log(`render ${i + 1} finished`)
  }
}

async function execute (mode) {
  if (mode !== 'jsreport' && mode !== 'http') {
    console.error('the second arg (mode) must be "jsreport" or "http"')
    process.exit(1)
  }

  if (mode === 'jsreport') {
    const client = require('@jsreport/nodejs-client')('http://localhost:5488')

    await client.render({
      template: {
        name: 'test'
      }
    })
  } else {
    const response = await fetch('http://localhost:3000/render')

    if (!response.ok) {
      const content = await response.text()
      throw new Error(`HTTP error! status: ${response.status}\n${content}`)
    }

    await response.text()
  }
}

many().catch((err) => {
  console.log('finished with error')
  console.error(err)
})

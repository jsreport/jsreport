import should from 'should'
import parseStreamingMultipart from '../../src/helpers/parseStreamingMultipart'

describe('parseStreamingMultipart', () => {
  it('parse one entry with one chunk in complete state', async () => {
    const boundary = '---------------------------9051914041544843365972754266'

    const logContent = JSON.stringify({ type: 'log', message: 'this is a test message', level: 'debug' })
    const logContentLength = Buffer.byteLength(logContent).toString()

    const response = createResponseMock(boundary, [
      concat(
        '\r\n',
        `--${boundary}\r\n`,
        'Content-Disposition: form-data; name="log content"\r\n',
        'Content-Type: application/json\r\n',
        `Content-Length: ${logContentLength}\r\n`,
        '\r\n',
        `${logContent}\r\n`,
        `--${boundary}--\r\n`
      )
    ])

    const files = []

    await parseStreamingMultipart(response, (fileInfo) => files.push(fileInfo))

    should(files.length).be.eql(1)
    should(files[0].name).be.eql('log content')
    should(files[0].headers['content-type']).be.eql('application/json')
    should(files[0].headers['content-length']).be.eql(logContentLength)
    should(files[0].contentType).be.eql('application/json')
    should(new TextDecoder().decode(files[0].rawData)).be.eql(logContent)
  })

  it('parse one entry with header chunks in pieces', async () => {
    const boundary = '---------------------------9051914041544843365972754266'

    const logContent = JSON.stringify({ type: 'log', message: 'this is a test message', level: 'debug' })
    const logContentLength = Buffer.byteLength(logContent).toString()

    const response = createResponseMock(boundary, [
      new TextEncoder().encode('\r\n'),
      new TextEncoder().encode(`--${boundary}\r\n`),
      new TextEncoder().encode('Content-Disposition: form-data'),
      new TextEncoder().encode('; name="log content"\r\n'),
      new TextEncoder().encode('Content-Type: application/'),
      new TextEncoder().encode('json\r\nContent'),
      new TextEncoder().encode(`-Length: ${logContentLength}`),
      new TextEncoder().encode('\r\n'),
      new TextEncoder().encode('\r\n'),
      new TextEncoder().encode(`${logContent}\r\n--${boundary}--\r\n`)
    ])

    const files = []

    await parseStreamingMultipart(response, (fileInfo) => files.push(fileInfo))

    should(files.length).be.eql(1)
    should(files[0].name).be.eql('log content')
    should(files[0].headers['content-type']).be.eql('application/json')
    should(files[0].headers['content-length']).be.eql(logContentLength)
    should(files[0].contentType).be.eql('application/json')
    should(new TextDecoder().decode(files[0].rawData)).be.eql(logContent)
  })

  it('parse one entry with body chunks in pieces', async () => {
    const boundary = '---------------------------9051914041544843365972754266'

    const logContent = JSON.stringify({ type: 'log', message: 'this is a test message', level: 'debug' })
    const logContentParts = logContent.split('')
    const logContentLength = Buffer.byteLength(logContent).toString()

    const response = createResponseMock(boundary, [
      new TextEncoder().encode(
        concat(
          '\r\n',
          `--${boundary}\r\n`,
          'Content-Disposition: form-data; name="log content"\r\n',
          'Content-Type: application/json\r\n',
          `Content-Length: ${Buffer.byteLength(logContent)}\r\n`
        )
      ),
      ...logContentParts.map((part, idx) => {
        const isFirst = idx === 0
        const isLast = idx === logContentParts.length - 1
        let content = ''

        if (isFirst) {
          content += '\r\n'
        }

        content += part

        if (isLast) {
          content += `\r\n--${boundary}--\r\n`
        }

        return new TextEncoder().encode(content)
      })
    ])

    const files = []

    await parseStreamingMultipart(response, (fileInfo) => files.push(fileInfo))

    should(files.length).be.eql(1)
    should(files[0].name).be.eql('log content')
    should(files[0].headers['content-type']).be.eql('application/json')
    should(files[0].headers['content-length']).be.eql(logContentLength)
    should(files[0].contentType).be.eql('application/json')
    should(new TextDecoder().decode(files[0].rawData)).be.eql(logContent)
  })

  it('parse multiple entries with one body chunk in complete state', async () => {
    const boundary = '---------------------------9051914041544843365972754266'

    const logContent = JSON.stringify({ type: 'log', message: 'this is a test message', level: 'debug' })
    const reportContent = 'report content'

    const response = createResponseMock(boundary, [
      concat(
        '\r\n',
        `--${boundary}\r\n`,
        'Content-Disposition: form-data; name="log content"\r\n',
        'Content-Type: application/json\r\n',
        `Content-Length: ${Buffer.byteLength(logContent)}\r\n`,
        '\r\n',
        `${logContent}\r\n`,
        `--${boundary}\r\n`,
        'Content-Disposition: form-data; name="report"; filename="main.pdf"\r\n',
        'Content-Type: application/pdf\r\n',
        `Content-Length: ${Buffer.byteLength(reportContent)}\r\n`,
        '\r\n',
        `${reportContent}\r\n`,
        `--${boundary}--\r\n`
      )
    ])

    const files = []

    await parseStreamingMultipart(response, (fileInfo) => files.push(fileInfo))

    should(files.length).be.eql(2)
    should(files[0].name).be.eql('log content')
    should(files[0].contentType).be.eql('application/json')
    should(new TextDecoder().decode(files[0].rawData)).be.eql(logContent)
    should(files[1].name).be.eql('report')
    should(files[1].contentType).be.eql('application/pdf')
    should(new TextDecoder().decode(files[1].rawData)).be.eql(reportContent)
  })

  it('parse multiple entries, one entry with one body chunk in complete state, and the other entries with body chunks in pieces', async () => {
    const boundary = '---------------------------9051914041544843365972754266'

    const logContent = JSON.stringify({ type: 'log', message: 'this is a test message', level: 'debug' })
    const reportContent = 'report content'

    const response = createResponseMock(boundary, [
      concat(
        '\r\n',
        `--${boundary}\r\n`,
        'Content-Disposition: form-data; name="log content"\r\n',
        'Content-Type: application/json\r\n',
        `Content-Length: ${Buffer.byteLength(logContent)}\r\n`,
        '\r\n',
        `${logContent}\r\n`
      ),
      new TextEncoder().encode(
        concat(
          `--${boundary}\r\n`,
          'Content-Disposition: form-data; name="report"; filename="main.pdf"\r\n',
          'Content-Type: application/pdf\r\n',
          `Content-Length: ${Buffer.byteLength(reportContent)}\r\n`,
          '\r\n',
          're'
        )
      ),
      new TextEncoder().encode(
        'port'
      ),
      new TextEncoder().encode(
        ' cont'
      ),
      new TextEncoder().encode(
        'ent\r\n',
        `--${boundary}--\r\n`
      )
    ])

    const files = []

    await parseStreamingMultipart(response, (fileInfo) => files.push(fileInfo))

    should(files.length).be.eql(2)
    should(files[0].name).be.eql('log content')
    should(files[0].contentType).be.eql('application/json')
    should(new TextDecoder().decode(files[0].rawData)).be.eql(logContent)
    should(files[1].name).be.eql('report')
    should(files[1].contentType).be.eql('application/pdf')
    should(new TextDecoder().decode(files[1].rawData)).be.eql(reportContent)
  })

  it('parse multiple entries with body chunks in pieces', async () => {
    const boundary = '---------------------------9051914041544843365972754266'

    const logContent = JSON.stringify({ type: 'log', message: 'this is a test message', level: 'debug' })
    const logContentParts = logContent.split('')
    const logContentLength = Buffer.byteLength(logContent).toString()
    const reportContent = 'report content'
    const reportContentParts = reportContent.split('')
    const reportContentLength = Buffer.byteLength(reportContent).toString()

    const response = createResponseMock(boundary, [
      new TextEncoder().encode(
        concat(
          '\r\n',
          `--${boundary}\r\n`,
          'Content-Disposition: form-data; name="log content"\r\n',
          'Content-Type: application/json\r\n',
          `Content-Length: ${logContentLength}\r\n`
        )
      ),
      ...logContentParts.map((part, idx) => {
        const isFirst = idx === 0
        const isLast = idx === logContentParts.length - 1
        let content = ''

        if (isFirst) {
          content += '\r\n'
        }

        content += part

        if (isLast) {
          content += '\r\n'
        }

        return new TextEncoder().encode(content)
      }),
      new TextEncoder().encode(
        concat(
          `--${boundary}\r\n`,
          'Content-Disposition: form-data; name="report"; filename="main.pdf"\r\n',
          'Content-Type: application/pdf\r\n',
          `Content-Length: ${reportContentLength}\r\n`
        )
      ),
      ...reportContentParts.map((part, idx) => {
        const isFirst = idx === 0
        const isLast = idx === logContentParts.length - 1
        let content = ''

        if (isFirst) {
          content += '\r\n'
        }

        content += part

        if (isLast) {
          content += `\r\n--${boundary}\r\n`
        }

        return new TextEncoder().encode(content)
      })
    ])

    const files = []

    await parseStreamingMultipart(response, (fileInfo) => files.push(fileInfo))

    should(files.length).be.eql(2)
    should(files[0].name).be.eql('log content')
    should(files[0].contentType).be.eql('application/json')
    should(new TextDecoder().decode(files[0].rawData)).be.eql(logContent)
    should(files[1].name).be.eql('report')
    should(files[1].contentType).be.eql('application/pdf')
    should(new TextDecoder().decode(files[1].rawData)).be.eql(reportContent)
  })

  it('parse multiple entries with last body boundary close in chunks', async () => {
    const boundary = '---------------------------9051914041544843365972754266'

    const logContent = JSON.stringify({ type: 'log', message: 'this is a test message', level: 'debug' })
    const reportContent = 'report content'
    const reportContentLength = Buffer.byteLength(reportContent).toString()

    const response = createResponseMock(boundary, [
      new TextEncoder().encode(
        concat(
          '\r\n',
          `--${boundary}\r\n`,
          'Content-Disposition: form-data; name="log content"\r\n',
          'Content-Type: application/json\r\n',
          `Content-Length: ${Buffer.byteLength(logContent)}\r\n`,
          '\r\n',
          `${logContent}\r\n`
        )
      ),
      new TextEncoder().encode(
        concat(
          `--${boundary}\r\n`,
          'Content-Disposition: form-data; name="report"; filename="main.pdf"\r\n',
          'Content-Type: application/pdf\r\n',
          `Content-Length: ${reportContentLength}\r\n`
        )
      ),
      new TextEncoder().encode(
        concat(
          '\r\nre'
        )
      ),
      new TextEncoder().encode(
        'port'
      ),
      new TextEncoder().encode(
        ' cont'
      ),
      new TextEncoder().encode(
        'ent\r\n--'
      ),
      new TextEncoder().encode(
        `${boundary}`
      ),
      new TextEncoder().encode(
        '--\r\n'
      )
    ])

    const files = []

    await parseStreamingMultipart(response, (fileInfo) => files.push(fileInfo))

    should(files.length).be.eql(2)
    should(files[0].name).be.eql('log content')
    should(files[0].contentType).be.eql('application/json')
    should(new TextDecoder().decode(files[0].rawData)).be.eql(logContent)
    should(files[1].name).be.eql('report')
    should(files[1].contentType).be.eql('application/pdf')
    should(new TextDecoder().decode(files[1].rawData)).be.eql(reportContent)
  })
})

function concat (...args) {
  return args.join('')
}

function createResponseMock (boundary, chunks) {
  let chunkIdx = 0

  return {
    headers: {
      get: (headerName) => {
        if (headerName === 'Content-Type') {
          return `multipart/form-data; boundary=${boundary}`
        }

        throw new Error(`header "${headerName}" unsupported in mock`)
      }
    },
    body: {
      getReader: () => {
        return {
          read: async () => {
            let result

            if (chunks[chunkIdx] == null) {
              result = { value: undefined, done: true }
            } else {
              let currentChunk = chunks[chunkIdx]

              if (currentChunk.constructor.name !== 'Uint8Array') {
                currentChunk = new TextEncoder().encode(currentChunk)
              }

              result = { value: currentChunk, done: false }
              chunkIdx++
            }

            return result
          },
          cancel: async () => {}
        }
      }
    }
  }
}

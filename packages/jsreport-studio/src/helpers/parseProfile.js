
async function parseProfile (profileStreamReader, onProfileMessage) {
  const textDecoder = new TextDecoder()
  let pending = ''

  const handleMessage = (rawMessage) => {
    onProfileMessage(rawMessage)
  }

  await profileStreamReader.read().then(function sendNext ({ value, done }) {
    if (done) {
      if (pending !== '') {
        handleMessage(pending)
      }

      return
    }

    let chunkStr = textDecoder.decode(value)

    if (pending !== '') {
      chunkStr = pending + chunkStr
      pending = ''
    }

    let messages = chunkStr.split('\n')

    if (messages.length > 0 && messages[messages.length - 1] !== '') {
      pending = messages.pop()
    }

    messages = messages.filter((m) => m !== '')

    // eslint-disable-next-line
    for (const m of messages) {
      handleMessage(m)
    }

    return profileStreamReader.read().then(sendNext)
  })
}

export default parseProfile

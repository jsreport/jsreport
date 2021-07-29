import Studio from 'jsreport-studio'
import io from 'socket.io-client'

Studio.initializeListeners.push(() => {
  if (!Studio.extensions['fs-store'].options.updateStudio) {
    console.log('Skipping active sync with server')
    return
  }

  const socket = io({ path: Studio.resolveUrl('/socket.io') })

  console.log('Listening to the server changes')
  let syncing = false
  socket.on('external-modification', async () => {
    const lastActiveEntity = Studio.getLastActiveTemplate()
    if (!lastActiveEntity || syncing) {
      return
    }

    console.log('Syncing last active entity', lastActiveEntity)
    syncing = true

    try {
      Studio.unloadEntity(lastActiveEntity._id)
      await Studio.loadEntity(lastActiveEntity._id)
      Studio.openTab({ _id: lastActiveEntity._id })
      Studio.run()
    } finally {
      syncing = false
    }
  })
})

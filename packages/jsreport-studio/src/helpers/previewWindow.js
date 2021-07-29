import assign from 'lodash/assign'

const previewWindows = {}

function getPreviewWindowOptions (id) {
  if (!id) {
    return {}
  }

  return {
    id,
    name: getPreviewWindowName(id),
    tab: true
  }
}

function getPreviewWindowName (id) {
  return `previewFrame-${id}`
}

function openPreviewWindow (opts) {
  const defaultWindowOpts = {
    directories: false,
    toolbar: false,
    titlebar: false,
    location: false,
    copyhistory: false,
    status: false,
    menubar: false,
    scrollbars: true,
    resizable: true
  }

  let windowOptsStr

  if (previewWindows[opts.id] != null) {
    if (previewWindows[opts.id].closed === true) {
      delete previewWindows[opts.id]
    } else {
      return previewWindows[opts.id]
    }
  }

  if (!opts.tab) {
    const windowOpts = assign({}, defaultWindowOpts, opts.windowOpts)

    const dualScreenLeft = window.screenLeft != null ? window.screenLeft : window.screen.left
    const dualScreenTop = window.screenTop != null ? window.screenTop : window.screen.top

    const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : window.screen.width
    const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : window.screen.height
    const windowWidth = width / 2
    const windowHeight = height / 1.3

    const left = ((width / 2) - (windowWidth / 2)) + dualScreenLeft
    const top = ((height / 2) - (windowHeight / 2)) + dualScreenTop

    windowOpts.top = top
    windowOpts.left = left
    windowOpts.width = windowWidth
    windowOpts.height = windowHeight

    windowOptsStr = (
      Object.keys(windowOpts)
        .map((opt) => `${opt}=${typeof windowOpts[opt] === 'boolean' ? (windowOpts[opt] ? 'yes' : 'no') : windowOpts[opt]}`)
        .join(',')
    )
  }

  const nWindow = window.open(
    opts.url || '',
    opts.name || '_blank',
    opts.tab ? undefined : windowOptsStr
  )

  previewWindows[opts.id] = nWindow

  if (nWindow.focus) {
    nWindow.focus()
  }

  const timerRef = setInterval(() => {
    if (nWindow.closed) {
      delete previewWindows[opts.id]
      clearInterval(timerRef)
    }
  }, 1000)

  return nWindow
}

export { openPreviewWindow, getPreviewWindowName, getPreviewWindowOptions, previewWindows }

import { extensions } from '../lib/configuration.js'
import resolveUrl from './resolveUrl.js'

function getDefaultTheme () {
  return {
    theme: extensions.studio.options.theme,
    editorTheme: extensions.studio.options.editorTheme
  }
}

function getCurrentTheme () {
  const defaultTheme = extensions.studio.options.theme
  const defaultEditorTheme = extensions.studio.options.editorTheme

  let currentTheme = defaultTheme
  let currentEditorTheme = defaultEditorTheme
  const userTheme = window.localStorage.getItem('studioTheme')
  const userEditorTheme = window.localStorage.getItem('studioEditorTheme')

  if (userTheme != null && extensions.studio.options.availableThemes[userTheme] != null) {
    currentTheme = userTheme
  }

  if (userEditorTheme != null && extensions.studio.options.availableEditorThemes[userEditorTheme] != null) {
    currentEditorTheme = userEditorTheme
  }

  if (currentEditorTheme == null) {
    currentEditorTheme = extensions.studio.options.availableThemes[currentTheme].editorTheme
  }

  return { theme: currentTheme, editorTheme: currentEditorTheme }
}

function setCurrentTheme ({ theme, editorTheme }, { onComplete, onError } = {}) {
  const callOnComplete = () => {
    if (onComplete) {
      onComplete()
    }
  }

  if (theme == null && editorTheme == null) {
    if (callOnComplete) {
      callOnComplete()
    }

    return getCurrentTheme()
  }

  if (theme == null && editorTheme != null) {
    changeEditorTheme(editorTheme)

    if (callOnComplete) {
      callOnComplete()
    }

    return getCurrentTheme()
  }

  const themeLinks = Array.prototype.slice.call(document.querySelectorAll('link[data-jsreport-studio-theme]'))
  const serverStartupHash = document.querySelector('meta[data-jsreport-server-startup-hash]').getAttribute('content')
  const customCssLink = document.querySelector('link[data-jsreport-studio-custom-css]')
  const defaultThemeLink = themeLinks.find((l) => l.dataset.defaultJsreportStudioTheme === 'true' || l.dataset.defaultJsreportStudioTheme === true)
  let targetThemeLink = themeLinks.find((l) => l.dataset.jsreportStudioTheme === theme)

  if (!defaultThemeLink) {
    return getCurrentTheme()
  }

  let newEditorTheme

  if (editorTheme != null) {
    newEditorTheme = editorTheme
  } else {
    newEditorTheme = getCurrentTheme().editorTheme
  }

  if (!targetThemeLink) {
    const newThemeLink = document.createElement('link')

    newThemeLink.rel = 'stylesheet'
    newThemeLink.href = resolveUrl(`/studio/assets/alternativeTheme.css?${serverStartupHash}&name=${theme}`)
    newThemeLink.disabled = false
    newThemeLink.dataset.jsreportStudioTheme = theme

    newThemeLink.onload = () => {
      changeTheme(theme)
      changeEditorTheme(newEditorTheme)

      if (customCssLink) {
        changeCustomCss(theme, callOnComplete, onError)
      } else {
        callOnComplete()
      }
    }

    newThemeLink.onerror = () => {
      if (onError) {
        onError()
      }
    }

    defaultThemeLink.parentNode.insertBefore(newThemeLink, defaultThemeLink.nextSibling)

    themeLinks.push(newThemeLink)

    targetThemeLink = newThemeLink

    return {
      theme: theme,
      editorTheme: newEditorTheme
    }
  } else {
    changeTheme(theme)
    changeEditorTheme(newEditorTheme)

    if (customCssLink) {
      changeCustomCss(theme, callOnComplete, onError)
    } else {
      callOnComplete()
    }

    return getCurrentTheme()
  }

  function changeTheme (newTheme) {
    targetThemeLink.disabled = false

    themeLinks.forEach((l) => {
      if (l.dataset.jsreportStudioTheme !== newTheme) {
        l.disabled = true
      }
    })

    window.localStorage.setItem('studioTheme', newTheme)
  }

  function changeEditorTheme (newEditorTheme) {
    window.localStorage.setItem('studioEditorTheme', newEditorTheme)
  }

  function changeCustomCss (newTheme, onLoad, onError) {
    const clonedLink = customCssLink.cloneNode()

    clonedLink.href = resolveUrl(`/studio/assets/customCss.css?theme=${newTheme}`)

    clonedLink.onload = () => {
      if (onLoad) {
        onLoad()
      }
    }

    clonedLink.onerror = () => {
      if (onError) {
        onError()
      }
    }

    customCssLink.parentNode.insertBefore(clonedLink, customCssLink.nextSibling)
    customCssLink.remove()
  }
}

function setCurrentThemeToDefault (opts = {}) {
  setCurrentTheme({
    theme: extensions.studio.options.theme,
    editorTheme: extensions.studio.options.editorTheme
  }, {
    ...opts,
    onComplete: () => {
      window.localStorage.removeItem('studioTheme')
      window.localStorage.removeItem('studioEditorTheme')

      if (opts.onComplete) {
        opts.onComplete()
      }
    }
  })

  return {
    theme: extensions.studio.options.theme,
    editorTheme: extensions.studio.options.editorTheme
  }
}

export { getCurrentTheme }
export { getDefaultTheme }
export { setCurrentTheme }
export { setCurrentThemeToDefault }

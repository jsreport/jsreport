const fs = require('fs')
const fsP = require('fs/promises')
const { Lock } = require('semaphore-async-await')

module.exports = function (cacheEnabled, customLogWarnFn) {
  const THEMES = {}

  const EDITOR_THEMES = {
    chrome: {
      previewColor: '#FFFFFF',
      previewAlternativeColor: '#AA0D91'
    },
    vs: {
      previewColor: '#FFFFFE',
      previewAlternativeColor: '#3501FF'
    },
    'vs-dark': {
      previewColor: '#1E1E1E',
      previewAlternativeColor: '#559BD4'
    },
    'hc-black': {
      previewColor: '#000000',
      previewAlternativeColor: '#3F6E95'
    }
  }

  const THEME_VARIABLES = {}

  const compiledThemeCss = {}
  const customCssResult = {}

  const themeCompilationLock = new Lock()
  const getCustomCssLock = new Lock()

  let logWarn = (msg) => {
    console.warn(msg)
  }

  if (customLogWarnFn) {
    logWarn = customLogWarnFn
  }

  return {
    getAllThemes () {
      return Object.keys(THEMES)
    },
    getAllEditorThemes () {
      return Object.keys(EDITOR_THEMES)
    },
    getAvailableThemeVariables () {
      return Object.keys(THEME_VARIABLES)
    },
    getTheme (name) {
      return THEMES[name]
    },
    getEditorTheme (name) {
      return EDITOR_THEMES[name]
    },
    registerTheme: (def) => doRegisterTheme(THEMES, EDITOR_THEMES, def, logWarn),
    registerThemeVariables: (varsDefPath) => doRegisterThemeVariables(THEME_VARIABLES, varsDefPath),
    getCurrentThemeVars: (themeName, customVariables) => doGetCurrentThemeVars(THEMES, THEME_VARIABLES, themeName, customVariables),
    compileTheme: (themeName, readCssContent, customVariables) => doCompileTheme(THEMES, THEME_VARIABLES, cacheEnabled ? compiledThemeCss : {}, themeCompilationLock, themeName, readCssContent, customVariables),
    compileCustomCss: (themeName, readCustomCssContent, customVariables) => doCompileCustomCss(THEMES, THEME_VARIABLES, cacheEnabled ? customCssResult : {}, getCustomCssLock, themeName, readCustomCssContent, customVariables)
  }
}

function doRegisterTheme (THEMES, EDITOR_THEMES, def, logWarn) {
  if (def == null) {
    throw new Error('.registerTheme needs a definition object')
  }

  if (def.name == null || def.name === '') {
    throw new Error('.registerTheme needs to have "name" property in the definition object')
  }

  if (def.previewColor == null) {
    throw new Error('.registerTheme needs to have "previewColor" property in the definition object')
  }

  if (def.editorTheme == null) {
    throw new Error('.registerTheme needs to have "editorTheme" property in the definition object')
  }

  if (!Object.keys(EDITOR_THEMES).includes(def.editorTheme)) {
    throw new Error(`.registerTheme needs to have a valid "editorTheme" in the definition object. allowed values: ${Object.keys(EDITOR_THEMES).join(', ')}`)
  }

  const badVariablesExportMsg = `Error when trying to load variables of theme "${
    def.name
  }" at ${def.variablesPath}, please verify that content of file is valid JSON object`

  if (def.variablesPath != null) {
    try {
      // we validate at startup if theme variables are good and throw early if there is some bad json
      JSON.parse(fs.readFileSync(def.variablesPath).toString())
    } catch (e) {
      e.message = `${badVariablesExportMsg}. ${e.message}`
      throw e
    }
  }

  THEMES[def.name] = {
    getVariables: async () => {
      if (def.variablesPath == null) {
        return {}
      }

      let variables

      try {
        variables = JSON.parse((await fsP.readFile(def.variablesPath)).toString())
      } catch (e) {
        logWarn(`${badVariablesExportMsg}, skipping applying variables of this theme. ${e.message}`)
        variables = {}
      }

      return variables
    },
    previewColor: def.previewColor,
    editorTheme: def.editorTheme
  }
}

function doRegisterThemeVariables (THEME_VARIABLES, varsDefPath) {
  let varsDef

  try {
    varsDef = JSON.parse(fs.readFileSync(varsDefPath).toString())
  } catch (e) {
    e.message = `Error when trying to .registerThemeVariables at ${varsDefPath}. ${e.message}`
    throw e
  }

  if (!Array.isArray(varsDef)) {
    throw new Error(`theme variables definition at ${varsDefPath} needs to export an array`)
  }

  varsDef.forEach((def) => {
    if (def.name == null || def.name === '') {
      throw new Error(`theme variables definition at ${varsDefPath} needs to have "name" property in the definition object`)
    }

    if (
      (def.extends == null || def.extends === '') &&
      (def.default == null || def.default === '')
    ) {
      throw new Error(`theme variables definition at ${varsDefPath} needs to have "default" or "extends" property in the definition object, variable "${def.name}" was bad defined`)
    }

    THEME_VARIABLES[def.name] = {
      default: def.default,
      extends: def.extends
    }
  })
}

async function doCompileCustomCss (THEMES, THEME_VARIABLES, customCssResult, getCustomCssLock, themeName, readCustomCssContent, customVariables) {
  if (customCssResult[themeName] != null) {
    return Promise.resolve(customCssResult[themeName])
  }

  await getCustomCssLock.acquire()

  try {
    if (customCssResult[themeName] != null) {
      return Promise.resolve(customCssResult[themeName])
    }

    let cssContent = await readCustomCssContent()
    const themeVars = await doGetCurrentThemeVars(THEMES, THEME_VARIABLES, themeName, customVariables)

    cssContent = await replaceThemeVars(cssContent, themeVars)

    customCssResult[themeName] = cssContent

    return cssContent
  } finally {
    getCustomCssLock.release()
  }
}

async function doCompileTheme (THEMES, THEME_VARIABLES, compiledThemeCss, themeCompilationLock, themeName, readCssContent, customVariables) {
  if (compiledThemeCss[themeName]) {
    return Promise.resolve(compiledThemeCss[themeName])
  }

  await themeCompilationLock.acquire()

  try {
    if (compiledThemeCss[themeName]) {
      return Promise.resolve(compiledThemeCss[themeName])
    }

    const themeVars = await doGetCurrentThemeVars(THEMES, THEME_VARIABLES, themeName, customVariables)
    const cssContent = await readCssContent()
    const newCssContent = await replaceThemeVars(cssContent, themeVars)

    compiledThemeCss[themeName] = newCssContent

    return newCssContent
  } finally {
    themeCompilationLock.release()
  }
}

async function doGetCurrentThemeVars (THEMES, THEME_VARIABLES, themeName, customVariables) {
  let variablesInTheme

  if (THEMES[themeName] != null) {
    variablesInTheme = await THEMES[themeName].getVariables()
  } else {
    variablesInTheme = {}
  }

  const themeVars = Object.assign(
    {},
    Object.entries(THEME_VARIABLES).reduce((acu, [varName, varDef]) => {
      if (varDef.default != null) {
        acu[varName] = varDef.default
      }

      return acu
    }, {}),
    variablesInTheme,
    customVariables != null ? customVariables : {}
  )

  return themeInheritance(THEME_VARIABLES, themeVars)
}

async function replaceThemeVars (content, currentVars) {
  const sassVarRegExp = /\$((?!\d)[\w_-][\w\d_-]*)/g

  // replace vars
  const newContent = content.replace(sassVarRegExp, (match, p1) => {
    let value = currentVars[p1]

    if (value == null) {
      value = ''
    } else {
      // replaces vars in vars values like tab-pane-backgroundColor: $secondary-backgroundColor
      value = value.replace(sassVarRegExp, (iMatch, iP1) => {
        if (currentVars[iP1] == null) {
          return ''
        }

        return currentVars[iP1]
      })
    }

    return value + `/*theme-var:${p1}*/`
  })

  return newContent
}

function themeInheritance (themeVariablesDef, currentVariables) {
  const inheritanceMap = Object.entries(themeVariablesDef).reduce((acu, [varName, varDef]) => {
    if (varDef.extends != null) {
      acu[varDef.extends] = acu[varDef.extends] || []
      acu[varDef.extends].push(varName)
    }

    return acu
  }, {})

  const variables = Object.assign({}, currentVariables)

  Object.entries(inheritanceMap).forEach(([genericName, vars]) => {
    vars.forEach((varName) => {
      if (variables[varName] == null) {
        variables[varName] = variables[genericName]
      }
    })
  })

  return variables
}

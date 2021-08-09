const path = require('path')
const fs = require('fs')
const should = require('should')
const request = require('supertest')
const jsreport = require('@jsreport/jsreport-core')
const studio = require('../../')

describe('studio', () => {
  let reporter

  async function prepareReporter (studioOptions = {}, customExt) {
    let instance = jsreport().use(require('@jsreport/jsreport-express')()).use(studio(studioOptions))

    if (customExt) {
      instance = instance.use(customExt)
    }

    reporter = instance

    return instance.init()
  }

  afterEach(() => reporter && reporter.close())

  it('allow customize studio browser title', async () => {
    await prepareReporter({
      title: 'my custom title'
    })

    const res = await request(reporter.express.app).get('/')
    const html = res.text
    const regexp = /<title>(.+)<\/title>/g
    const title = regexp.exec(html)[1]

    should(title).be.eql('my custom title')
  })

  it('allow customize studio browser title using values from reporter instance', async () => {
    await prepareReporter({
      // eslint-disable-next-line
      title: 'version: ${jsreport.version}'
    })

    const res = await request(reporter.express.app).get('/')
    const html = res.text
    const regexp = /<title>(.+)<\/title>/g
    const title = regexp.exec(html)[1]

    should(title).be.eql(`version: ${reporter.version}`)
  })

  describe('theme', () => {
    it('allow register custom theme', async () => {
      await prepareReporter(undefined, {
        name: 'custom-theme',
        dependencies: ['studio'],
        directory: __dirname,
        main: (instance, definition) => {
          instance.studio.registerTheme({
            name: 'custom',
            variablesPath: null,
            previewColor: '#70d628',
            editorTheme: 'vs-dark'
          })
        }
      })

      should(reporter.studio.getAllThemes()).containEql('custom')
    })

    it('allow register theme variables', async () => {
      const customThemeVarsDefPath = path.join(__dirname, 'customThemeVarsDefinition.json')

      await prepareReporter(undefined, {
        name: 'custom-theme',
        dependencies: ['studio'],
        directory: __dirname,
        main: (instance, definition) => {
          fs.writeFileSync(customThemeVarsDefPath, JSON.stringify([{
            name: 'custom-color',
            default: '#df2f2f'
          }, {
            name: 'custom-color2',
            default: '#f4f75b'
          }], null, 2))

          instance.studio.registerThemeVariables(customThemeVarsDefPath)
        }
      })

      should(reporter.studio.getAvailableThemeVariables()).containEql('custom-color')
      should(reporter.studio.getAvailableThemeVariables()).containEql('custom-color2')

      fs.unlinkSync(customThemeVarsDefPath)
    })

    it('should be able to compile default theme', async () => {
      await prepareReporter()

      const defaultTheme = reporter.studio.getAllThemes()[0]
      const defaultThemeVarsValues = await reporter.studio.getCurrentThemeVars(defaultTheme)

      const mainCssFilename = fs.readdirSync(path.join(__dirname, '../../static/dist')).find((filename) => {
        return filename.startsWith('main.') && filename.endsWith('.css')
      })

      const res = await request(reporter.express.app).get(`/studio/assets/${mainCssFilename}`)

      const primaryColorResult = /(?:[a-zA-Z-]+): *([\w#]+)\/\*theme-var:primary-color\*\//g.exec(res.text)
      const primaryBackgroundColorResult = /(?:[a-zA-Z-]+): *([\w#]+)\/\*theme-var:primary-backgroundColor\*\//g.exec(res.text)

      should(primaryColorResult[1]).be.eql(defaultThemeVarsValues['primary-color'])
      should(primaryBackgroundColorResult[1]).be.eql(defaultThemeVarsValues['primary-backgroundColor'])
    })

    it('should be able to compile alternative theme', async () => {
      const customThemeVarsPath = path.join(__dirname, 'customThemeVarsDefinition.json')

      await prepareReporter(undefined, {
        name: 'custom-theme',
        dependencies: ['studio'],
        directory: __dirname,
        main: (instance, definition) => {
          fs.writeFileSync(customThemeVarsPath, JSON.stringify({
            'primary-color': '#cfcfcf',
            'primary-backgroundColor': '#212121'
          }, null, 2))

          instance.studio.registerTheme({
            name: 'custom',
            variablesPath: customThemeVarsPath,
            previewColor: '#70d628',
            editorTheme: 'vs-dark'
          })
        }
      })

      const themeVarsValues = await reporter.studio.getCurrentThemeVars('custom')

      const res = await request(reporter.express.app).get('/studio/assets/alternativeTheme.css?name=custom')
      const primaryColorResult = /(?:[a-zA-Z-]+): *([\w#]+)\/\*theme-var:primary-color\*\//g.exec(res.text)
      const primaryBackgroundColorResult = /(?:[a-zA-Z-]+): *([\w#]+)\/\*theme-var:primary-backgroundColor\*\//g.exec(res.text)

      should(primaryColorResult[1]).be.eql(themeVarsValues['primary-color'])
      should(primaryBackgroundColorResult[1]).be.eql(themeVarsValues['primary-backgroundColor'])

      fs.unlinkSync(customThemeVarsPath)
    })

    it('should be able to compile custom css', async () => {
      await prepareReporter({
        theme: {
          customCss: {
            content: `
              .myclass {
                color: $primary-color;
                background-color: $primary-backgroundColor;
              }
            `
          }
        }
      })

      const defaultTheme = reporter.studio.getAllThemes()[0]
      const defaultThemeVarsValues = await reporter.studio.getCurrentThemeVars(defaultTheme)
      const res = await request(reporter.express.app).get(`/studio/assets/customCss.css?theme=${defaultTheme}`)
      const primaryColorResult = /(?:[a-zA-Z-]+): *([\w#]+)\/\*theme-var:primary-color\*\//g.exec(res.text)
      const primaryBackgroundColorResult = /(?:[a-zA-Z-]+): *([\w#]+)\/\*theme-var:primary-backgroundColor\*\//g.exec(res.text)

      should(primaryColorResult[1]).be.eql(defaultThemeVarsValues['primary-color'])
      should(primaryBackgroundColorResult[1]).be.eql(defaultThemeVarsValues['primary-backgroundColor'])
    })

    it('should be able to use custom values for variables', async () => {
      const customVarsValues = {
        'primary-color': 'white',
        'primary-backgroundColor': 'black'
      }

      await prepareReporter({
        theme: {
          variables: customVarsValues
        }
      })

      const mainCssFilename = fs.readdirSync(path.join(__dirname, '../../static/dist')).find((filename) => {
        return filename.startsWith('main.') && filename.endsWith('.css')
      })

      const res = await request(reporter.express.app).get(`/studio/assets/${mainCssFilename}`)

      const primaryColorResult = /(?:[a-zA-Z-]+): *([\w#]+)\/\*theme-var:primary-color\*\//g.exec(res.text)
      const primaryBackgroundColorResult = /(?:[a-zA-Z-]+): *([\w#]+)\/\*theme-var:primary-backgroundColor\*\//g.exec(res.text)

      should(primaryColorResult[1]).be.eql(customVarsValues['primary-color'])
      should(primaryBackgroundColorResult[1]).be.eql(customVarsValues['primary-backgroundColor'])
    })
  })
})

import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import ChromeTheme from 'monaco-themes/themes/Chrome DevTools.json'
import MonacoEditor from 'react-monaco-editor'
import throttle from 'lodash/throttle'
import debounce from 'lodash/debounce'
import { reformat } from '../../redux/editor/actions'
import reformatter from '../../helpers/reformatter'
import { getCurrentTheme } from '../../helpers/theme'
import { values as configuration } from '../../lib/configuration'

const lastTextEditorMounted = {
  timeoutId: null,
  timestamp: null
}

class TextEditor extends Component {
  constructor (props) {
    super(props)

    this.lintWorker = null
    this.oldCode = null
    this.monacoEditorData = null

    this.getFocus = this.getFocus.bind(this)
    this.setUpLintWorker = this.setUpLintWorker.bind(this)
    this.lint = this.lint.bind(this)
    this.lint = debounce(this.lint, 400)
    this.editorWillMount = this.editorWillMount.bind(this)
    this.editorDidMount = this.editorDidMount.bind(this)
    this.editorWillUnmount = this.editorWillUnmount.bind(this)
    this.editorOnChange = this.editorOnChange.bind(this)
    this.calculateEditorLayout = this.calculateEditorLayout.bind(this)

    this.state = {
      editorTheme: getCurrentTheme().editorTheme
    }
  }

  componentDidUpdate (prevProps) {
    if (prevProps.readOnly !== this.props.readOnly) {
      this.monacoEditorData.editor.updateOptions({ readOnly: this.props.readOnly === true })
    }
  }

  componentWillUnmount () {
    for (let i = 0; i < configuration.textEditorInstances.length; i++) {
      const textEditorInfo = configuration.textEditorInstances[i]

      if (textEditorInfo.name === this.props.name) {
        configuration.textEditorInstances.splice(i, 1)
        break
      }
    }

    this.oldCode = null

    this.unsubscribeSplitPaneEvents()
    this.unsubscribeTabActiveEvent()

    window.removeEventListener('resize', this.throttledCalculateEditorLayout)

    this.unsubscribeThemeChange()

    if (this.lintWorker) {
      this.lintWorker.terminate()
    }
  }

  editorWillMount (monaco) {
    ChromeTheme.colors['editor.lineHighlightBackground'] = '#EDEDED'

    // js updates
    this.updateThemeRule(ChromeTheme, 'string', '1f19a6')
    this.updateThemeRule(ChromeTheme, 'number', '1f19a6')
    this.updateThemeRule(ChromeTheme, 'regexp', '1f19a6')
    this.updateThemeRule(ChromeTheme, 'regexp.escape', '687587')
    this.updateThemeRule(ChromeTheme, 'regexp.escape.control', '585CF6')
    this.updateThemeRule(ChromeTheme, 'string.escape', '585CF6')
    // html updates
    this.updateThemeRule(ChromeTheme, 'tag.html', 'aa0d91')
    this.updateThemeRule(ChromeTheme, 'delimiter.handlebars', 'aa0d91')
    this.updateThemeRule(ChromeTheme, 'variable.parameter.handlebars', 'F6971F')
    this.updateThemeRule(ChromeTheme, 'keyword.helper.handlebars', 'F6971F')
    this.updateThemeRule(ChromeTheme, 'attribute.name', '994407')
    this.updateThemeRule(ChromeTheme, 'attribute.value', '1f19a6')
    // css updates
    this.updateThemeRule(ChromeTheme, 'tag.css', '318495')
    this.updateThemeRule(ChromeTheme, 'attribute.name.css', '6D78DE')
    this.updateThemeRule(ChromeTheme, 'attribute.value.css', '27950C')
    this.updateThemeRule(ChromeTheme, 'attribute.value.number.css', '2900CD')
    this.updateThemeRule(ChromeTheme, 'attribute.value.unit.css', '920F80')
    // json updates
    this.updateThemeRule(ChromeTheme, 'string.key.json', '1f19a6')
    this.updateThemeRule(ChromeTheme, 'string.value.json', '1f19a6')

    configuration.textEditorInitializeListeners.forEach((fn) => {
      fn({ monaco, theme: ChromeTheme })
    })

    monaco.editor.defineTheme('chrome', ChromeTheme)
  }

  editorDidMount (editor, monaco) {
    this.monacoEditorData = {
      containerElement: editor.getContainerDomNode(),
      editor
    }

    this.throttledCalculateEditorLayout = throttle(this.calculateEditorLayout, 200, {
      trailing: true
    })

    this.unsubscribeSplitPaneEvents = configuration.subscribeToSplitPaneEvents(this.monacoEditorData.containerElement, {
      change: this.throttledCalculateEditorLayout,
      collapseChange: this.calculateEditorLayout
    })

    this.unsubscribeTabActiveEvent = configuration.subscribeToTabActiveEvent(this.monacoEditorData.containerElement, this.calculateEditorLayout)

    window.addEventListener('resize', this.throttledCalculateEditorLayout)

    this.unsubscribeThemeChange = configuration.subscribeToThemeChange(({ newEditorTheme }) => {
      this.setState({
        editorTheme: newEditorTheme
      })
    })

    setTimeout(() => {
      this.calculateEditorLayout()
    }, 100)

    configuration.textEditorInstances.push({ name: this.props.name, instance: editor })

    monaco.languages.typescript.typescriptDefaults.setMaximumWorkerIdleTime(-1)
    monaco.languages.typescript.javascriptDefaults.setMaximumWorkerIdleTime(-1)

    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true
    })

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true
    })

    // adding universal ctrl + y, cmd + y handler
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Y, () => {
      editor.trigger('jsreport-studio', 'redo')
    })

    // adding universal ctrl + shift + f, cmd + shift + f handler reformat key binding
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_F, () => {
      editor.getAction('editor.action.formatDocument').run()
    })

    if (this.props.readOnly) {
      editor.updateOptions({ readOnly: true })
    }

    const self = this

    const defaultFormattersPerLang = {
      html: (value) => reformatter(value, 'html'),
      handlebars: (value) => reformatter(value, 'html'),
      javascript: (value) => reformatter(value, 'js'),
      json: (value) => reformatter(value, 'js'),
      css: (value) => reformatter(value, 'css')
    }

    // we override here the monaco "Format Document" option for all registered languages,
    // what we do is that we replace the default format of monaco with the .reformat logic of the registered
    // editorComponents of studio. so if user click "Format Document" option of monaco what will be executed is
    // the .reformat logic of current active editorComponent, if there is no .reformat logic for the current editor then
    // we check if the current language is a well known one (like css), if it is then we reformat using a default reformatter,
    // if it isn't then we just do nothing
    monaco.languages.getLanguages().map((l) => l.id).forEach((lang) => {
      monaco.languages.registerDocumentFormattingEditProvider(lang, {
        async provideDocumentFormattingEdits (model, options, token) {
          let update

          try {
            const registeredReformatterExists = await self.props.reformat()

            if (!registeredReformatterExists && defaultFormattersPerLang[lang]) {
              update = {
                range: model.getFullModelRange(),
                text: defaultFormattersPerLang[lang](model.getValue())
              }
            }
          } catch (e) {
            console.error(`Error when reformatting language "${lang}"`, e)
          }

          if (update) {
            return [update]
          }

          return []
        }
      })
    })

    // monkey path setValue option to make it preserve undo stack
    // when editing text editor (by prop change)
    editor.setValue = (newValue) => {
      const model = editor.getModel()

      if (newValue !== model.getValue()) {
        model.pushEditOperations(
          [],
          [
            {
              range: model.getFullModelRange(),
              text: newValue
            }
          ]
        )
      }
    }

    // auto-size it
    editor.layout()

    window.requestAnimationFrame(() => {
      this.setUpLintWorker(editor, monaco)

      let autoCloseTimeout

      // auto-close tag handling
      editor.onDidChangeModelContent((e) => {
        if (this.props.mode !== 'html' && this.props.mode !== 'handlebars') {
          return
        }

        if (typeof autoCloseTimeout !== 'undefined') {
          clearTimeout(autoCloseTimeout)
        }

        const changes = e.changes
        const lastChange = changes[changes.length - 1]
        const lastCharacter = lastChange.text[lastChange.text.length - 1]

        if (lastChange.rangeLength > 0 || lastCharacter !== '>') {
          return
        }

        autoCloseTimeout = setTimeout(() => {
          const pos = editor.getPosition()
          const textInLineAtCursor = editor.getModel().getLineContent(pos.lineNumber).slice(0, lastChange.range.endColumn)
          let foundValidOpenTag = false
          let extractIndex = 0
          let tagName
          let openTag

          while (textInLineAtCursor.length !== Math.abs(extractIndex) && !foundValidOpenTag) {
            extractIndex--
            openTag = textInLineAtCursor.slice(extractIndex)

            if (Math.abs(extractIndex) <= 2) {
              continue
            }

            if (
              openTag[0] === '/' ||
              openTag[0] === '>' ||
              openTag[0] === ' '
            ) {
              break
            }

            if (openTag[0] === '<' && openTag[openTag.length - 1] === '>') {
              tagName = openTag.slice(1, -1)
              foundValidOpenTag = true
            }
          }

          if (!foundValidOpenTag) {
            return
          }

          const targetRange = new monaco.Range(
            pos.lineNumber,
            pos.column - openTag.length,
            pos.lineNumber,
            pos.column
          )

          const op = {
            identifier: { major: 1, minor: 1 },
            range: targetRange,
            text: `${openTag}</${tagName}>`,
            forceMoveMarkers: true
          }

          editor.executeEdits('auto-close-tag', [op])

          editor.setPosition(pos)

          autoCloseTimeout = undefined
        }, 100)
      })

      editor.onDidChangeModelContent((e) => {
        const newCode = editor.getModel().getValue()
        const filename = typeof this.props.getFilename === 'function' ? this.props.getFilename() : ''

        if (newCode !== this.oldCode) {
          this.lint(newCode, filename, editor.getModel().getVersionId())
        }

        this.oldCode = newCode
      })
    })

    this.oldCode = editor.getModel().getValue()

    configuration.textEditorCreatedListeners.forEach((fn) => {
      fn({ monaco, editor })
    })

    const nowTimestamp = Date.now()
    const threshold = 350
    const defer = 250
    const initialFocus = this.props.preventInitialFocus !== true

    // this logic calls get focus only if some time (threshold) has passed since the last
    // time of an editor has been mounted, this prevents getting multiple active cursors when
    // a lot of entities/tabs are loaded (like the playground case which opens multiple tabs at page load).
    if (
      (lastTextEditorMounted.timestamp == null ||
      (nowTimestamp - lastTextEditorMounted.timestamp > threshold)) &&
      initialFocus
    ) {
      clearTimeout(lastTextEditorMounted.timeoutId)

      lastTextEditorMounted.timeoutId = setTimeout(() => {
        clearTimeout(lastTextEditorMounted.timeoutId)
        lastTextEditorMounted.timeoutId = null
        this.getFocus()
      }, defer)

      lastTextEditorMounted.timestamp = nowTimestamp
    } else {
      if (initialFocus && lastTextEditorMounted.timeoutId) {
        clearTimeout(lastTextEditorMounted.timeoutId)

        lastTextEditorMounted.timeoutId = setTimeout(() => {
          clearTimeout(lastTextEditorMounted.timeoutId)
          lastTextEditorMounted.timeoutId = null
          this.getFocus()
        }, defer)

        lastTextEditorMounted.timestamp = nowTimestamp
      }
    }
  }

  editorWillUnmount () {
    this.monacoEditorData = null
  }

  editorOnChange (v) {
    const { onUpdate } = this.props
    onUpdate(v)
  }

  getFocus () {
    const self = this

    if (!self.monacoEditorData) {
      setTimeout(() => {
        self.getFocus()
      }, 150)
    } else {
      self.monacoEditorData.editor.focus()
    }
  }

  updateThemeRule (theme, tokenName, foregroundColor) {
    const r = theme.rules.find((i) => i.token === tokenName)

    if (r) {
      r.foreground = foregroundColor
    } else {
      theme.rules.push({
        foreground: foregroundColor,
        token: tokenName
      })
    }
  }

  setUpLintWorker (editor, monaco) {
    if (this.lintWorker) {
      return
    }

    this.lintWorker = new Worker(
      /* webpackChunkName: "linter-worker" */ new URL('./workers/linter.worker.js', import.meta.url)
    )

    this.lintWorker.addEventListener('message', (event) => {
      const { markers } = event.data

      window.requestAnimationFrame(() => {
        if (!editor.getModel()) {
          return
        }

        const model = editor.getModel()

        monaco.editor.setModelMarkers(model, 'eslint', markers)
      })
    })

    // first lint
    window.requestAnimationFrame(() => {
      if (!editor.getModel()) {
        return
      }

      const filename = typeof this.props.getFilename === 'function' ? this.props.getFilename() : ''

      this.lint(
        this.props.value,
        filename,
        editor.getModel().getVersionId()
      )
    })
  }

  calculateEditorLayout (ev) {
    if (this.monacoEditorData && this.monacoEditorData.editor) {
      this.monacoEditorData.editor.layout()
    }
  }

  lint (code, filename, version) {
    if (!this.lintWorker || this.props.mode !== 'javascript') {
      return
    }

    this.lintWorker.postMessage({
      filename,
      code,
      version
    })
  }

  render () {
    const { editorTheme } = this.state
    const { value, name, mode } = this.props

    const editorOptions = {
      roundedSelection: false,
      automaticLayout: false,
      dragAndDrop: false,
      lineNumbersMinChars: 4,
      fontSize: 11.8,
      'bracketPairColorization.enabled': true,
      minimap: {
        enabled: false
      }
    }

    return (
      <MonacoEditor
        name={name}
        width='100%'
        height='100%'
        language={mode}
        theme={editorTheme}
        value={value || ''}
        editorWillMount={this.editorWillMount}
        editorDidMount={this.editorDidMount}
        editorWillUnmount={this.editorWillUnmount}
        options={editorOptions}
        // eslint-disable-next-line react/jsx-handler-names
        onChange={this.editorOnChange}
      />
    )
  }
}

TextEditor.propTypes = {
  readOnly: PropTypes.bool,
  value: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  mode: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired
}

export default connect(undefined, {
  reformat
}, undefined, { forwardRef: true })(TextEditor)

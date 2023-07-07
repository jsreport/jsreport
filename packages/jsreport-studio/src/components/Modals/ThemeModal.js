import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { getCurrentTheme, getDefaultTheme, setCurrentTheme, setCurrentThemeToDefault } from '../../helpers/theme'
import { values as configuration } from '../../lib/configuration'
import style from './ThemeModal.css'

class ThemeModal extends Component {
  constructor (props) {
    super(props)

    this.state = {
      selectedTheme: getCurrentTheme().theme,
      selectedEditorTheme: getCurrentTheme().editorTheme
    }
  }

  changeTheme (newTheme) {
    const { theme, editorTheme } = getCurrentTheme()

    const newEditorTheme = configuration.extensions.studio.options.availableThemes[newTheme].editorTheme

    setCurrentTheme({
      theme: newTheme,
      editorTheme: newEditorTheme
    }, {
      onComplete: () => {
        configuration.triggerThemeChange({
          oldTheme: theme,
          oldEditorTheme: editorTheme,
          newTheme: newTheme,
          newEditorTheme: newEditorTheme
        })
      }
    })

    this.setState({
      selectedTheme: newTheme,
      selectedEditorTheme: newEditorTheme
    })
  }

  changeEditorTheme (newEditorTheme) {
    const { theme, editorTheme } = getCurrentTheme()

    const { theme: newTheme } = setCurrentTheme({
      editorTheme: newEditorTheme
    }, {
      onComplete: () => {
        configuration.triggerThemeChange({
          oldTheme: theme,
          oldEditorTheme: editorTheme,
          newTheme: newTheme,
          newEditorTheme: newEditorTheme
        })
      }
    })

    this.setState({
      selectedEditorTheme: newEditorTheme
    })
  }

  restoreThemeToDefault () {
    const { theme: oldTheme, editorTheme: oldEditorTheme } = getCurrentTheme()
    const { theme: newTheme, editorTheme: newEditorTheme } = getDefaultTheme()

    setCurrentThemeToDefault({
      onComplete: () => {
        configuration.triggerThemeChange({
          oldTheme: oldTheme,
          oldEditorTheme: oldEditorTheme,
          newTheme: newTheme,
          newEditorTheme: newEditorTheme
        })
      }
    })

    this.setState({
      selectedTheme: newTheme,
      selectedEditorTheme: newEditorTheme
    })
  }

  render () {
    const { selectedTheme, selectedEditorTheme } = this.state
    const { availableThemes, availableEditorThemes } = this.props.options

    return (
      <div>
        <h2>Theme</h2>
        <div className={style.container}>
          {Object.keys(availableThemes).map((themeName) => (
            <div key={themeName} className={style.item} onClick={() => this.changeTheme(themeName)}>
              <label className={style.itemLabel}>
                <input
                  type='radio'
                  value={themeName}
                  onChange={(ev) => {
                    ev.target.checked && this.changeTheme(themeName)
                  }}
                  checked={selectedTheme === themeName}
                />
                {themeName}
              </label>
              <div className={style.itemPreview} style={{ backgroundColor: availableThemes[themeName].previewColor }} />
            </div>
          ))}
        </div>
        <h2>Editor Theme</h2>
        <div className={style.container}>
          {Object.keys(availableEditorThemes).map((themeName) => (
            <div key={themeName} className={style.miniItem} onClick={() => this.changeEditorTheme(themeName)}>
              <label className={style.miniItemLabel}>
                <input
                  type='radio'
                  value={themeName}
                  onChange={(ev) => {
                    ev.target.checked && this.changeEditorTheme(themeName)
                  }}
                  checked={selectedEditorTheme === themeName}
                />
                {themeName}
              </label>
              <div className={style.miniItemPreview} style={{ backgroundColor: availableEditorThemes[themeName].previewColor }} />
              <div className={style.miniItemPreview} style={{ backgroundColor: availableEditorThemes[themeName].previewAlternativeColor }} />
            </div>
          ))}
        </div>
        <br />
        <div className='button-bar'>
          <button className='button confirmation' onClick={() => this.props.close()}>Confirm</button>
          <button style={{ whiteSpace: 'nowrap' }} className='button danger' onClick={() => this.restoreThemeToDefault()}>Restore to default</button>
        </div>
      </div>
    )
  }
}

ThemeModal.propTypes = {
  options: PropTypes.object.isRequired
}

export default ThemeModal

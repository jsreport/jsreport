/* import PropTypes from 'prop-types' */
import React, { Component } from 'react'
import logo from './jsreport-bg.png'

class AboutModal extends Component {
  /* TODO
  static propTypes = {
    options: PropTypes.object.isRequired
  }
  */

  constructor (props) {
    super(props)

    this.state = {
      collapsed: true
    }
  }

  render () {
    const { version, engines, recipes, extensions } = this.props.options

    return (
      <div>
        <h2>About</h2>
        <div>
          <img src={logo} style={{ width: '100px', height: 'auto' }} />
        </div>
        <div>
          version: <b>{version}</b>
        </div>
        <br />
        <div>
          <a
            className='button confirmation'
            href={`https://github.com/jsreport/jsreport/releases/tag/${version}`}
            target='_blank'
            rel='noreferrer'
            style={{ marginLeft: 0 }}
          >
            Release notes
          </a>
        </div>
        <br />
        <div>
          <div>
            engines:
          </div>
          <div>
            <b>{engines.sort().join(', ')}</b>
          </div>
        </div>
        <br />
        <div>
          <div>
            recipes:
          </div>
          <div>
            <b>{recipes.sort().join(', ')}</b>
          </div>
        </div>
        <hr />
        <div>
          <span
            style={{ display: 'inline-block', cursor: 'pointer' }}
            onClick={() => this.setState((state) => ({ collapsed: !state.collapsed }))}
          >
            <i className={`fa ${this.state.collapsed ? 'fa-caret-right' : 'fa-caret-down'}`} /> extensions
          </span>
          <div style={{ display: this.state.collapsed ? 'none' : 'block' }}>
            <ul style={{ listStyle: 'none', paddingLeft: '5px', maxHeight: '220px', overflow: 'auto' }}>
              {Object.keys(extensions).sort().map((name) => {
                const extension = extensions[name]

                return (
                  <li key={extension.name}><b>{extension.name}:</b> {extension.version}</li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    )
  }
}

export default AboutModal

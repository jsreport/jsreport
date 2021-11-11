/* import PropTypes from 'prop-types' */
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { createGetActiveEntitySelector } from '../../redux/editor/selectors'
import style from './ApiModal.css'

class ApiModal extends Component {
  /* TODO
  static propTypes = {
    options: PropTypes.object.isRequired
  }
  */

  getRootUrl () {
    const location = window.location.href.split('?')[0].split('#')[0]

    if (location.indexOf('/studio') === -1) {
      return location.replace(/\/$/, '')
    }

    return location.split('/studio')[0].replace(/\/$/, '')
  }

  syntaxHighlight (json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // eslint-disable-next-line no-useless-escape
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = style.number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = style.key
        } else {
          cls = style.string
        }
      } else if (/true|false/.test(match)) {
        cls = style.boolean
      } else if (/null/.test(match)) {
        cls = style.null
      }
      return '<span class="' + cls + '">' + match + '</span>'
    })
  }

  render () {
    const body = { template: { name: 'name or path' }, data: { aProperty: 'value' } }

    return (
      <div>
        <h3>Render report using REST API </h3>

        <div className={style.row}>
          <span className={style.label}>POST: </span><a className={style.url}><b>{this.getRootUrl() + '/api/report'}</b></a>
        </div>
        <div className={style.row}>
          <span className={style.label + ' ' + style.minor}>HEADERS:</span>
          <code>Content-Type: application/json</code>
        </div>
        <div className={style.row}>
          <span className={style.label + ' ' + style.minor}>BODY:</span>
          <code dangerouslySetInnerHTML={{ __html: this.syntaxHighlight(JSON.stringify(body)) }} />
        </div>
        <h3>Use one of the jsreport clients </h3>
        <div>
          <a href='https://jsreport.net/learn/dotnet-client' target='_blank' rel='noreferrer'><button style={{ marginLeft: '0rem' }} className='button confirmation'>.NET</button></a>
          <a href='https://github.com/hedonCZ/jsreport-javaclient' target='_blank' rel='noreferrer'><button className='button confirmation'>Java</button></a>
          <a href='https://jsreport.net/learn/nodejs-client' target='_blank' rel='noreferrer'><button className='button confirmation'>nodejs</button></a>
          <a href='https://jsreport.net/learn/browser-client' target='_blank' rel='noreferrer'><button className='button confirmation'>browser</button></a>
          <a href='https://jsreport.net/learn/cli' target='_blank' rel='noreferrer'><button className='button confirmation'>CLI</button></a>
        </div>
        <br />
        <div>
          <a className={style.link} href='http://jsreport.net/learn/api' target='_blank' rel='noreferrer'>
            <i className='fa fa-lightbulb-o' /> open API documentation
          </a>
        </div>

        <div>
          <a className={style.link} href={this.getRootUrl() + '/odata/$metadata'} target='_blank' rel='noreferrer'>
            <i className='fa fa-lightbulb-o' /> open odata metadata
          </a>
        </div>
      </div>
    )
  }
}

function makeMapStateToProps () {
  const getActiveEntity = createGetActiveEntitySelector()

  return (state) => ({
    entity: getActiveEntity(state)
  })
}

export default connect(makeMapStateToProps)(ApiModal)

import { Component } from 'react'
import Studio from 'jsreport-studio'

class FooterStyleProblemModal extends Component {
  constructor (props) {
    super(props)
    this.state = { problematicEntities: null }
  }

  async componentDidMount () {
    try {
      const res = await Studio.api.get('/api/pdf-utils/footer-style-problems')
      this.setState({ problematicEntities: res })
    } catch (e) {
      alert(e)
    }
  }

  ignore () {
    Studio.setSetting('pdf-utils-footer-style-problem-checked-found', false)
    this.props.close()
  }

  async fix () {
    try {
      await Studio.api.post('/api/pdf-utils/footer-style-problems')
      Studio.setSetting('pdf-utils-footer-style-problem-checked-found', false)
      alert('Footer styles fixed')
    } catch (e) {
      alert(e)
    } finally {
      this.props.close()
    }
  }

  render () {
    return (
      <div>
        <h2>Eventual footers style problems found</h2>
        <div>
          <p>
            The latest Chromium contains breaking changes in the CSS flexbox calculation and we found that this may eventually impact your footers alignment.
            The fix is to change the CSS used to render footers and replace the following CSS:
          </p>
          <p>
            <code>.main.height=100%</code><br /><br />with<br /><br /><code>.main.height=100vh</code>.<br />
          </p>
          <p>
            You can do this manually later and ignore this now or you can let the automation to correct the styles using "Try to fix" button.
          </p>

          <p>

            This is the list of affected entities jsreport found:<br />
            {this.state.problematicEntities == null ? <i className='fa fa-circle-o-notch fa-spin' /> : ''}

            <textarea
              style={{ width: '100%', boxSizing: 'border-box' }} rows='10' readOnly
              value={(this.state.problematicEntities || []).map((entity) => (
                `${entity.path} (${entity.entitySet})`
              )).join('\n')}
            />

          </p>
          <p style={{ fontWeight: 'bold' }}>
            Make sure you have backup before performing the automatic fix!
          </p>
        </div>
        <br />
        <div className='button-bar'>
          <button className='button confirmation' title='The same popup will open after you refresh studio' onClick={() => this.props.close()}>Remind later</button>
          <button style={{ whiteSpace: 'nowrap' }} className='button confirmation' title='The above entities content will be fixed' onClick={() => this.fix()}>Try to fix</button>
          <button style={{ whiteSpace: 'nowrap' }} className='button confirmation' title='Nothing happends and you can fix entities by hand or ignore it' onClick={() => this.ignore()}>Ignore</button>
        </div>
      </div>
    )
  }
}

export default FooterStyleProblemModal

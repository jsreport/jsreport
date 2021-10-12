import { Component } from 'react'
import styles from './ErrorModal.css'

class ErrorModal extends Component {
  render () {
    const { close, options } = this.props
    const { title, error, containerStyle, renderCustomButtons } = options

    return (
      <div>
        <h3>{title != null ? title : 'Error details'}</h3>
        <div className={`form-group ${styles.errorContainer}`} style={containerStyle}>
          <pre className={styles.errorMessage}>
            {error.message}
          </pre>
          <pre className={styles.errorStack}>
            {error.stack}
          </pre>
        </div>
        <div className='button-bar'>
          <button className='button confirmation' onClick={() => close()}>Ok</button>
          {renderCustomButtons && renderCustomButtons()}
        </div>
      </div>
    )
  }
}

export default ErrorModal

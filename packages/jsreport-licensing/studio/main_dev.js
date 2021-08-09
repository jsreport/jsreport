import Studio from 'jsreport-studio'
import Style from './style.css'

function renderLicenseType (licensingInfo) {
  if (licensingInfo.unreachable) {
    return (
      <p>
        The licensing server was not reachable during the instance startup. The instance now runs in the enterprise mode and the license validation will be performed again during the next restart.
      </p>
    )
  }

  if (licensingInfo.type === 'subscription') {
    if (licensingInfo.pendingExpiration === true) {
      return (
        <div>
          <p>
            The subscription is no longer active probably due to failed payment or cancellation. The subscription can be used for maximum one month in inactive state.
          </p>
          <PaymentNote paymentType={licensingInfo.paymentType} />
        </div>
      )
    }

    return (
      <div>
        <p>
          The subscription renewal is planned on {licensingInfo.expiresOn.toLocaleDateString()} and the license will be again validated afterwards.
        </p>
        <PaymentNote paymentType={licensingInfo.paymentType} />
      </div>
    )
  }

  if (licensingInfo.type === 'perpetual') {
    return (
      <p>
        Perpetual license is validated for the version {licensingInfo.validatedForVersion} with free upgrades to the versions released before {licensingInfo.expiresOn.toLocaleDateString()}.
        The license will be remotely validated again if the instance is upgraded to a different version.
      </p>
    )
  }

  if (licensingInfo.type === 'trial') {
    return (
      <p>
        The trial license expires on {licensingInfo.expiresOn.toLocaleDateString()}.
        You will need to purchase enterprise license to be able to store more than 5 templates afterwards.
      </p>
    )
  }

  if (licensingInfo.type === 'free') {
    return <p>You can use up to 5 templates for free.</p>
  }
}

function PaymentNote ({ paymentType }) {
  if (paymentType === 'gumroad') {
    return (
      <p>
        You can find further information about payments in the <a href='https://gumroad.com/library' target='_blank' rel='noreferrer'>gumroad library</a>.`
      </p>
    )
  }

  if (paymentType === 'manual') {
    return (
      <p>
        The license is payed through manual invoices and bank transfers. Please contact <a href='mailto: support@jsreport.net'>support@jsreport.net</a> to get further information.
      </p>
    )
  }

  if (paymentType === 'braintree') {
    return (
      <p>
        You can find further information about payments in the <a href='https://jsreport.net/payments/customer' target='_blank' rel='noreferrer'>customer portal</a>.
      </p>
    )
  }

  return <span />
}

Studio.readyListeners.push(async () => {
  const licensingInfo = Studio.extensions.licensing.options
  if (licensingInfo.development) {
    Studio.addStartupComponent((props) => (
      <div className={Style.developmentLicense}>
        Development only license applied
      </div>
    ))
  }

  if (licensingInfo.usageCheckFailureInfo) {
    Studio.openModal(() => (
      <div>
        <p>
          {licensingInfo.usageCheckFailureInfo.message}
        </p>

        <p>
          The development instances should use config license.development=true and every production instance should have its own enterprise license key. The deployment with several production jsreport instances should use enterprise scale license which doesn't limit the license key usage.
        </p>
      </div>
    ))
  }

  const trialModal = () => Studio.openModal(() => (
    <div>
      <p>
        Free license is limited to maximum 5 templates.
        Your jsreport instance is now running in one month trial. Please buy
        the enterprise license if you want to continue using jsreport after the trial expires.
      </p>

      <p>
        The instructions for buying enterprise license can be found <a href='http://jsreport.net/buy' target='_blank' rel='noreferrer'>here</a>.
      </p>
    </div>
  ))

  const licenseInfoModal = () => Studio.openModal(() => (
    <div>
      <h2>
        {licensingInfo.license} license
        {licensingInfo.development ? ' (development)' : ''}
      </h2>
      {renderLicenseType(licensingInfo)}
      <p>More information about licensing and pricing can be found <a href='http://jsreport.net/buy' target='_blank' rel='noreferrer'>here</a>.</p>
    </div>
  ))

  const pendingExpirationModal = () => Studio.openModal(() => (
    <div>
      <h2>subscription has expired</h2>
      <p>
        The subscription is no longer active probably due to failed payment or cancellation.
        The subscription can be used for maximum one month in inactive state.
      </p>
      <PaymentNote paymentType={licensingInfo.paymentType} />
    </div>
  ))

  if (licensingInfo.type === 'trial' && Studio.getAllEntities().filter((e) => e.__entitySet === 'templates' && !e.__isNew).length > 5) {
    trialModal()
  }

  if (licensingInfo.type === 'subscription' && licensingInfo.pendingExpiration === true) {
    pendingExpirationModal()
  }

  if (licensingInfo.license === 'free') {
    const interval = setInterval(() => {
      if (Studio.getAllEntities().filter((e) => e.__entitySet === 'templates' && !e.__isNew).length > 5) {
        clearInterval(interval)
        trialModal()
        licensingInfo.type = licensingInfo.license = 'trial'
        const now = new Date()
        now.setDate(now.getDate() + 30)
        licensingInfo.expiresOn = now
        Studio.api.post('/api/licensing/trial', {}).then(m => {
          if (m.status === 1) {
            setTimeout(() => Studio.openModal(() => <div>{m.message}</div>), 5000)
          }
        })
      }
    }, 10000)
  }

  Studio.addToolbarComponent((props) => (
    <div
      className='toolbar-button'
      onClick={() => {
        licenseInfoModal()
        props.closeMenu()
      }}
    >
      <div style={{ textTransform: 'capitalize' }}>
        <i className='fa fa-gavel' />{licensingInfo.license} <i className='fa fa-info-circle' style={{ marginRight: 0 }} />
      </div>
    </div>
  ), 'settings')
})

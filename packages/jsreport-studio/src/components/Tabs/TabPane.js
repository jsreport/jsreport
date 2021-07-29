import React, { Component } from 'react'
import TabContent from './TabContent'
import style from './Tabs.css'

class TabPane extends Component {
  render () {
    const { activeTabKey } = this.props

    return (
      <div className={'block ' + style.tabPane} style={{ minHeight: 0, height: 'auto' }}>
        <div className={'block' + ' ' + (style.tab || '')} style={{ minHeight: 0, height: 'auto' }}>
          {React.Children.map(this.props.children, (t) => (
            <TabContent
              key={t.key}
              active={t.key === activeTabKey}
            >
              {t.props.children}
            </TabContent>
          ))}
        </div>
      </div>
    )
  }
}

export default TabPane

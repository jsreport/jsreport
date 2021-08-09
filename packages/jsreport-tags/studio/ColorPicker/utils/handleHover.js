import React from 'react'

const handleHover = (Component, Span = 'span') => {
  return class Hover extends React.Component {
    constructor (props) {
      super(props)

      this.state = { hover: false }

      this.handleMouseOver = this.handleMouseOver.bind(this)
      this.handleMouseOut = this.handleMouseOut.bind(this)
    }

    handleMouseOver () {
      this.setState({ hover: true })
    }

    handleMouseOut () {
      this.setState({ hover: false })
    }

    render () {
      return (
        <Span onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <Component {...this.props} {...this.state} />
        </Span>
      )
    }
  }
}

export default handleHover

import PropTypes from 'prop-types'
import React, { Component } from 'react'
import style from './HighlightedArea.css'

class HighlightedArea extends Component {
  getRelativePositionInsideContainer (containerDimensions, areaPosition, topOrLeft) {
    let position

    if (topOrLeft === 'top') {
      position = areaPosition - containerDimensions.top
    } else {
      position = areaPosition - containerDimensions.left
    }

    return position
  }

  render () {
    const { highlightedArea, getContainerDimensions } = this.props
    const offset = 2

    if (!highlightedArea) {
      return null
    }

    const containerDimensions = getContainerDimensions()

    return (
      <div>
        {highlightedArea.label && (
          <div
            key='group-label'
            className={style.label}
            style={{
              top: `${this.getRelativePositionInsideContainer(containerDimensions, highlightedArea.label.top, 'top')}px`,
              left: `${this.getRelativePositionInsideContainer(containerDimensions, highlightedArea.label.left, 'left')}px`,
              width: `${highlightedArea.label.width + offset}px`,
              height: `${highlightedArea.label.height}px`,
              marginLeft: `-${offset}px`
            }}
          />
        )}
        {highlightedArea.hierarchy && (
          <div
            key='group-hierarchy'
            className={style.hierarchy}
            style={{
              top: `${this.getRelativePositionInsideContainer(containerDimensions, highlightedArea.hierarchy.top, 'top')}px`,
              left: `${this.getRelativePositionInsideContainer(containerDimensions, highlightedArea.hierarchy.left, 'left')}px`,
              width: typeof highlightedArea.hierarchy.width === 'string' ? highlightedArea.hierarchy.width : `${highlightedArea.hierarchy.width}px`,
              height: `${highlightedArea.hierarchy.height}px`,
              marginLeft: `-${offset}px`
            }}
          >
            <div className={style.hierarchyTop} />
            <div className={style.hierarchyBottom} />
          </div>
        )}
      </div>
    )
  }
}

HighlightedArea.propTypes = {
  highlightedArea: PropTypes.object,
  getContainerDimensions: PropTypes.func
}

export default HighlightedArea

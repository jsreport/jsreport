import PropTypes from 'prop-types'
import React from 'react'
import style from './Popover.css'

const Popover = (props) => {
  const {
    wrapper = true,
    triangle = true,
    color,
    topWrapper,
    open,
    onClose,
    children
  } = props

  const stylesForWrapper = {}
  const stylesForTriangleWrapper = {}
  let marginTopWrapper

  if (topWrapper == null) {
    if (triangle) {
      marginTopWrapper = 9
    } else {
      marginTopWrapper = 0
    }
  } else {
    marginTopWrapper = topWrapper
  }

  stylesForWrapper.marginTop = `${marginTopWrapper}px`

  if (color) {
    stylesForWrapper.backgroundColor = color
    stylesForTriangleWrapper.borderBottomColor = color
  }

  return (
    <div className={style.popoverDisplayLayer} style={open ? { display: 'block' } : { display: 'none' }}>
      <div className={style.popoverContainer}>
        <div className={style.popoverCloseLayer} onClick={onClose} />
        <div className={style.popoverContent}>
          {
            open
              ? (
                  wrapper
                    ? (
                      <div className={style.popoverContentWrapper} style={stylesForWrapper}>
                        {triangle && <div className={style.popoverTriangleShadow} />}
                        {triangle && <div className={style.popoverTriangle} style={stylesForTriangleWrapper} />}
                        {children}
                      </div>
                      )
                    : (
                        triangle
                          ? (
                            <div>
                              <div className={style.popoverTriangleShadow} />
                              <div className={style.popoverTriangle} style={stylesForTriangleWrapper} />
                              {children}
                            </div>
                            )
                          : children
                      )
                )
              : null
          }
        </div>
      </div>
    </div>
  )
}

Popover.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  wrapper: PropTypes.bool,
  triangle: PropTypes.bool,
  color: PropTypes.string,
  topWrapper: PropTypes.number
}

export default Popover

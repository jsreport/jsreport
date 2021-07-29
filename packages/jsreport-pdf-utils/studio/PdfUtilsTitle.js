import React from 'react'

export default (props) => <span>{props.entity.name + ' pdf utils ' + (props.entity.__isDirty ? '*' : '')}</span>

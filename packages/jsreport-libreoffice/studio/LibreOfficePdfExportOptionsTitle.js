import React from 'react'

export default (props) => <span>{props.entity.name + ' libreoffice ' + (props.entity.__isDirty ? '*' : '')}</span>

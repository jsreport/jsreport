function addEvent (data, ev) {
  if (ev.type === 'error') {
    return {
      ...data,
      profileErrorEvent: ev
    }
  }

  if (ev.type === 'log') {
    return {
      ...data,
      profileLogs: [...data.profileLogs, ev]
    }
  }

  if (ev.type === 'operationStart') {
    return {
      ...data,
      profileOperations: [...data.profileOperations, {
        startEvent: ev,
        id: ev.operationId,
        previousOperationId: ev.previousOperationId,
        name: ev.name
      }]
    }
  }

  const operationIndex = data.profileOperations.findIndex(op => op.id === ev.operationId)
  const newOperations = [...data.profileOperations.slice(0, operationIndex), {
    ...data.profileOperations[operationIndex],
    endEvent: ev
  }, ...data.profileOperations.slice(operationIndex + 1)]

  return {
    ...data,
    profileOperations: newOperations
  }
}

export { addEvent }

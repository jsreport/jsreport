/**
 * This action type will be dispatched when your router
 * receives a location change.
 */
export const LOCATION_CHANGE = '@@router/LOCATION_CHANGE'

export const onLocationChanged = (location, action, isFirstRendering = false) => ({
  type: LOCATION_CHANGE,
  payload: {
    location,
    action,
    isFirstRendering
  }
})

/**
 * This action type will be dispatched by the router navigate actions below.
 * If you're writing a middleware to watch for navigation events, be sure to
 * look for actions of this type.
 */
export const CALL_HISTORY_METHOD = '@@router/CALL_HISTORY_METHOD'

const updateLocation = (method) => {
  return (...args) => ({
    type: CALL_HISTORY_METHOD,
    payload: {
      method,
      args
    }
  })
}

/**
 * These actions correspond to the router.navigate API.
 * The associated routerMiddleware will capture these events before they get to
 * your reducer and reissue them as the matching function on your router.
 */
export const push = updateLocation('push')
export const replace = updateLocation('replace')
export const go = updateLocation('go')
export const goBack = updateLocation('back')
export const goForward = updateLocation('forward')

export const routerActions = { push, replace, go, goBack, goForward }

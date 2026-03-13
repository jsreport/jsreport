import { CALL_HISTORY_METHOD } from './actions'

/**
 * This middleware captures CALL_HISTORY_METHOD actions to redirect to the
 * provided router object. This will prevent these actions from reaching your
 * reducer or any middleware that comes after this one.
 */
const routerMiddleware = (ctx) => store => next => action => { // eslint-disable-line no-unused-vars
  if (action.type !== CALL_HISTORY_METHOD) {
    return next(action)
  }

  const { payload: { method, args } } = action
  let navigate

  if (method === 'push') {
    navigate = (to, state) => {
      ctx.router.navigate(to, { state })
    }
  } else if (method === 'replace') {
    navigate = (to, state) => {
      ctx.router.navigate(to, { state, replace: true })
    }
  } else if (method === 'go') {
    navigate = (number) => {
      ctx.router.navigate(number)
    }
  } else if (method === 'back') {
    navigate = () => {
      ctx.router.navigate(-1)
    }
  } else if (method === 'forward') {
    navigate = () => {
      ctx.router.navigate(1)
    }
  } else {
    throw new Error(`Unsupported navigation method: ${method}`)
  }

  navigate(...args)
}

export default routerMiddleware

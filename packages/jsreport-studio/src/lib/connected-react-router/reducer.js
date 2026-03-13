import { LOCATION_CHANGE } from './actions'

/**
 * Adds query to location.
 * Utilizes the search prop of location to construct query.
 */
const injectQuery = (location) => {
  if (location && location.query) {
    // Don't inject query if it already exists in router
    return location
  }

  const searchQuery = location && location.search

  if (typeof searchQuery !== 'string' || searchQuery.length === 0) {
    return {
      ...location,
      query: {}
    }
  }

  // Ignore the `?` part of the search string e.g. ?username=test
  const search = searchQuery.substring(1)
  // Split the query string on `&` e.g. ?username=test&name=Kennedy
  const queries = search.split('&')
  // Construct query
  const query = queries.reduce((acc, currentQuery) => {
    // Split on `=`, to get key and value
    const [queryKey, queryValue] = currentQuery.split('=')
    return {
      ...acc,
      [queryKey]: queryValue
    }
  }, {})

  return {
    ...location,
    query
  }
}

const createConnectRouter = (structure) => {
  const {
    fromJS,
    merge
  } = structure

  const createRouterReducer = () => {
    /*
    * This reducer will update the state with the most recent location in router
    * has transitioned to.
    */
    return (state = null, { type, payload } = {}) => {
      if (type === LOCATION_CHANGE) {
        const { location, action, isFirstRendering } = payload
        // Don't update the state ref for the first rendering
        // to prevent the double-rendering issue on initialization
        return state != null && isFirstRendering
          ? state
          : merge(state, { location: fromJS(injectQuery(location)), action })
      }

      return state
    }
  }

  return createRouterReducer
}

export default createConnectRouter

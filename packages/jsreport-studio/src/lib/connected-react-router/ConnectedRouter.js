import { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect, ReactReduxContext } from 'react-redux'
import { RouterProvider } from 'react-router/dom'
import isEqualWith from 'lodash/isEqualWith'
import { onLocationChanged } from './actions'
import createSelectors from './selectors'

const createConnectedRouter = (structure) => {
  const { getLocation } = createSelectors(structure)
  /*
   * ConnectedRouter listens to a router object passed from props.
   * When router location is changed, it dispatches action to redux store.
   * Then, store will pass props to component to render.
   * This creates uni-directional flow from router location->store->router->components.
   */
  class ConnectedRouter extends PureComponent {
    constructor (props) {
      super(props)

      const { store, router, onLocationChanged } = props

      this.inTimeTravelling = false

      // Subscribe to store changes to check if we are in time travelling
      this.unsubscribe = store.subscribe(() => {
        // Allow time travel debugging compatibility to be turned off
        // as the detection for this (below) is error prone in apps where the
        // store may be unmounted, a navigation occurs, and then the store is re-mounted
        // during the app's lifetime. Detection could be much improved if Redux DevTools
        // simply set a global variable like `REDUX_DEVTOOLS_IS_TIME_TRAVELLING=true`.
        const isTimeTravelDebuggingAllowed = !props.noTimeTravelDebugging

        // Extract store's location
        const {
          pathname: pathnameInStore,
          search: searchInStore,
          hash: hashInStore,
          state: stateInStore
        } = getLocation(store.getState())

        // Extract router's location
        const {
          pathname: pathnameInRouter,
          search: searchInRouter,
          hash: hashInRouter,
          state: stateInRouter
        } = router.state.location

        // If we do time travelling, the location in store is changed but location in router is not changed
        if (
          isTimeTravelDebuggingAllowed &&
          router.state.historyAction === 'PUSH' &&
          (pathnameInRouter !== pathnameInStore ||
            searchInRouter !== searchInStore ||
            hashInRouter !== hashInStore ||
            !isEqualWith(stateInStore, stateInRouter))
        ) {
          this.inTimeTravelling = true
          // Update router's location to match store's location
          router.navigate({
            pathname: pathnameInStore,
            search: searchInStore,
            hash: hashInStore,
            state: stateInStore
          })
        }
      })

      const handleLocationChange = (location, action, isFirstRendering = false) => {
        // Dispatch onLocationChanged except when we're in time travelling
        if (!this.inTimeTravelling) {
          onLocationChanged(location, action, isFirstRendering)
        } else {
          this.inTimeTravelling = false
        }
      }

      // Listen to router changes
      this.unlisten = router.subscribe(({ location, historyAction }) => {
        handleLocationChange(location, historyAction)
      })

      if (!props.noInitialPop) {
        // Dispatch a location change action for the initial location.
        // This makes it backward-compatible with react-router-redux.
        // But, we add `isFirstRendering` to `true` to prevent double-rendering.
        handleLocationChange(router.state.location, router.state.historyAction, true)
      }
    }

    componentWillUnmount () {
      this.unlisten()
      this.unsubscribe()
    }

    render () {
      const { router } = this.props

      return (
        <RouterProvider router={router} />
      )
    }
  }

  ConnectedRouter.propTypes = {
    store: PropTypes.shape({
      getState: PropTypes.func.isRequired,
      subscribe: PropTypes.func.isRequired
    }).isRequired,
    router: PropTypes.shape({
      state: PropTypes.shape({
        location: PropTypes.object.isRequired,
        historyAction: PropTypes.string.isRequired
      }).isRequired,
      subscribe: PropTypes.func.isRequired,
      navigate: PropTypes.func.isRequired
    }).isRequired,
    basename: PropTypes.string,
    children: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
    onLocationChanged: PropTypes.func.isRequired,
    noInitialPop: PropTypes.bool,
    noTimeTravelDebugging: PropTypes.bool,
    stateCompareFunction: PropTypes.func,
    omitRouter: PropTypes.bool
  }

  const mapDispatchToProps = dispatch => ({
    onLocationChanged: (location, action, isFirstRendering) => dispatch(onLocationChanged(location, action, isFirstRendering))
  })

  const ConnectedRouterWithContext = props => {
    const Context = props.context || ReactReduxContext

    if (Context == null) {
      throw new Error('Please upgrade to react-redux v6')
    }

    return (
      <Context.Consumer>
        {({ store }) => <ConnectedRouter store={store} {...props} />}
      </Context.Consumer>
    )
  }

  ConnectedRouterWithContext.propTypes = {
    context: PropTypes.object
  }

  return connect(null, mapDispatchToProps)(ConnectedRouterWithContext)
}

export default createConnectedRouter

import React from 'react'
import { createBrowserRouter, useParams } from 'react-router-dom'
import { rootPath } from './lib/configuration'
import App from './containers/App/App'

export function getInitialRouterState () {
  const router = createBrowserRouter([{ path: getPathDef(), element: null }])
  return { location: router.state.location, action: router.state.historyAction }
}

export function getRouter (customRouteList) {
  const routes = customRouteList || []

  const router = createBrowserRouter([
    {
      path: getPathDef(),
      element: <RoutedApp />
    },
    {
      path: getPathDef('/studio'),
      element: <RoutedApp />
    },
    {
      path: getPathDef('/studio/profiles/:profileId'),
      element: <RoutedApp />
    },
    {
      path: getPathDef('/studio/:entitySet'),
      element: <RoutedApp />
    },
    {
      path: getPathDef('/studio/:entitySet/:shortid'),
      element: <RoutedApp />
    },
    ...routes.map((r) => ({
      path: getPathDef(r.path),
      element: <RoutedApp component={r.component} />
    })),
    {
      path: '/*',
      element: <RoutedApp />
    }
  ])

  return router
}

function RoutedApp (props) {
  const { component, ...restProps } = props
  const params = useParams()

  const renderProps = {
    ...restProps,
    match: {
      params
    }
  }

  if (component) {
    return React.createElement(component, renderProps)
  }

  return <App {...props} match={{ params }} />
}

function getPathDef (path) {
  const currentRootPath = rootPath()

  if (path == null) {
    return currentRootPath === '' ? '/' : currentRootPath
  }

  return `${currentRootPath}${path}`
}

import React, { Fragment, useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Preview from './Preview'
import UndockNewTab from './MenuActions/UndockNewTab'
import ClearAction from './MenuActions/ClearAction'
import { actions as editorActions } from '../../redux/editor'
import { values as configuration } from '../../lib/configuration'

const MainPreview = () => {
  const preview = useSelector((state) => state.editor.preview)
  const tabs = useMemo(() => ([...(configuration.previewComponents[preview.type].tabs || [])]), [preview.type])

  const actions = useMemo(() => {
    return [
      ...(configuration.previewComponents[preview.type].actions || []),
      {
        component: UndockNewTab
      },
      {
        component: ClearAction
      }
    ]
  }, [preview.type])

  const dispatch = useDispatch()

  const changeTab = useCallback((newActiveTab) => {
    dispatch(editorActions.updatePreview(preview.id, {
      activeTab: newActiveTab
    }))
  }, [dispatch, preview.id])

  const handleRenderActions = useCallback((actionProps) => {
    return (
      // eslint-disable-next-line
      <Fragment>
        {actions.map((action, idx) => React.createElement(action.component, {
          ...actionProps,
          key: idx,
          id: preview.id,
          type: preview.type,
          data: preview.data,
          activeTab: preview.activeTab,
          completed: preview.completed
        }))}
      </Fragment>
    )
  }, [actions, preview])

  const previewContent = React.createElement(configuration.previewComponents[preview.type].component, {
    key: preview.id,
    id: preview.id,
    type: preview.type,
    data: preview.data,
    activeTab: preview.activeTab,
    completed: preview.completed
  })

  return (
    <Preview
      tabs={tabs}
      renderActions={handleRenderActions}
      activeTab={preview.activeTab}
      onActiveTabChange={changeTab}
    >
      {previewContent}
    </Preview>
  )
}

export default MainPreview

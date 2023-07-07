import React, { useCallback, useMemo } from 'react'
import classNames from 'classnames'
import Highlighter from 'react-highlight-words'
import { values as configuration } from '../../../../lib/configuration'
import openEditorLine from '../../../../helpers/openEditorLine'
import resolveEntityTreeIconStyle from '../../../../helpers/resolveEntityTreeIconStyle'
import storeMethods from '../../../../redux/methods'
import Accordion from './Accordion'
import styles from './TextSearchPreviewType.css'

function ResultItem (props) {
  const { id, text, result, expanded, onToggle } = props
  const { docPropMatches } = result
  const localEntity = storeMethods.getEntityById(result.entity._id, false)
  const entityIconClass = enhancedResolveEntityTreeIconStyle(localEntity) || (configuration.entitySets[result.entitySet].faIcon || styles.defaultEntityIcon)

  const titleClass = classNames({
    [styles.itemRemoved]: localEntity == null
  })

  const itemClass = classNames(styles.itemContent, {
    [styles.itemRemoved]: localEntity == null
  })

  const matchesCount = useMemo(() => (
    docPropMatches.reduce((count, item) => count + item.lineMatches.length, 0)
  ), [docPropMatches])

  const handleOnToggle = useCallback(function handleOnToggle () {
    onToggle(id)
  }, [id, onToggle])

  return (
    <Accordion
      title={(
        <Title
          className={titleClass}
          name={result.entity.name}
          matchesCount={matchesCount}
          expanded={expanded}
          entityPath={result.entityPath}
          entityIconClass={entityIconClass}
        />
      )}
      expanded={expanded}
      onToggle={handleOnToggle}
    >
      <div className={itemClass}>
        {docPropMatches.map((docPropMatch) => (
          <Match
            key={docPropMatch.docProp}
            mode={docPropMatches.length > 1 ? 'group' : 'single'}
            shortid={result.entity.shortid}
            text={text}
            match={docPropMatch}
          />
        ))}
        <div className={styles.itemContentGuide} />
      </div>
    </Accordion>
  )
}

function Title ({ className, name, matchesCount, expanded, entityPath, entityIconClass }) {
  const itemClass = classNames(styles.itemTitle, className)

  const expandedIconClass = classNames('fa', {
    'fa-chevron-down': expanded,
    'fa-chevron-right': !expanded
  }, styles.fullWidthIcon)

  const eIconClass = classNames('fa', entityIconClass, styles.fullWidthIcon)
  const ePathClass = classNames(styles.secondaryText, styles.parentPath)

  const entityParentPath = useMemo(() => getEntityParentPath(entityPath), [entityPath])

  return (
    <div className={itemClass}>
      <span className={styles.expandedIcon}>
        <i className={expandedIconClass} />
      </span>
      <span className={styles.entityIcon}>
        <i className={eIconClass} />
      </span>
      {name}
      <span className={ePathClass}>•&nbsp;{entityParentPath}</span>
      <span className={styles.matchesBadge}>{matchesCount}</span>
    </div>
  )
}

function Match ({ mode = 'group', shortid, text, match }) {
  const { docProp, lineMatches } = match
  const docPropId = useMemo(() => docProp.replace(/\./g, '_'), [docProp])

  if (mode !== 'group' && mode !== 'single') {
    throw new Error(`Invalid value "${mode}" for mode prop - Match`)
  }

  const shouldShowTitle = mode === 'group'

  return (
    <div key={docProp}>
      {shouldShowTitle && (
        <div className={`${styles.docPropMatchTitle} ${styles.secondaryText}`}>
          <span><i className='fa fa-bars' /> {docProp}</span>
          <span className={styles.matchesBadge}>{lineMatches.length}</span>
          <div className={styles.docPropMatchSeparator} />
        </div>
      )}
      {lineMatches.map((match, idx) => (
        <div
          key={`${docProp}-${idx}`}
          className={styles.match}
          onClick={() => {
            openEditorLine(shortid, {
              docProp,
              lineNumber: match.start,
              endLineNumber: match.end,
              startColumn: match.startCharacter + 1,
              endColumn: match.endCharacter + 1,
              getEditorName: (e) => [`${e._id}_${docPropId}`, e._id],
              isContentTheSame: (e) => e.__isDirty !== true
            })
          }}
        >
          <Highlighter
            className={styles.matchText}
            activeIndex={match.preview.match == null ? -1 : 0}
            highlightTag='span'
            activeClassName={styles.matchHighlightText}
            title={match.preview.text}
            searchWords={[text]}
            textToHighlight={match.preview.text}
            findChunks={() => {
              if (match.preview.match == null) {
                return []
              }

              return [{
                start: match.preview.match.start,
                end: match.preview.match.end
              }]
            }}
          />
          <div
            className={`${styles.matchLineNumber} ${styles.secondaryText}`}
            title={getMatchTitle(match)}
          >
            {getMatchLineDesc(match)}
          </div>
        </div>
      ))}
    </div>
  )
}

function enhancedResolveEntityTreeIconStyle (entity) {
  if (entity == null) {
    return
  }

  return resolveEntityTreeIconStyle(entity)
}

function getMatchTitle (match) {
  const restOfLines = match.end - match.start
  let suffix = ''

  if (restOfLines > 0) {
    suffix = ` + ${restOfLines} line(s)`
  }

  return `From line ${match.start}${suffix}`
}

function getMatchLineDesc (match) {
  const restOfLines = match.end - match.start
  let suffix = ''

  if (restOfLines > 0) {
    suffix = `+${restOfLines}`
  }

  return `:${match.start}${suffix}`
}

function getEntityParentPath (entityPath) {
  const fullPath = entityPath.split('/').slice(0, -1).join('/')
  return fullPath === '' ? '/' : fullPath
}

export default ResultItem

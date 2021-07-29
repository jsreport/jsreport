import getRootUrl from '../../helpers/rootUrl'

function LinkModal (props) {
  const rootUrl = getRootUrl()

  return (
    <div>
      <p>
        You can also use browser's http get to render the report template. Just follow this link.
      </p>

      <a href={`${rootUrl}/templates/${props.options.entity.shortid}`} target='_blank' rel='noreferrer'>{`${rootUrl}/templates/${props.options.entity.shortid}`}</a>
    </div>
  )
}

export default LinkModal

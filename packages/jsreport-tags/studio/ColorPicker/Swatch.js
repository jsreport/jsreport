
const Swatch = ({ color, style, onClick, title = color }) => {
  const styles = {
    swatch: {
      background: color,
      height: '100%',
      width: '100%',
      cursor: 'pointer'
    }
  }

  const handleClick = (e) => onClick(color, e)

  return (
    <div style={styles.swatch} onClick={handleClick} title={title} />
  )
}

export default Swatch

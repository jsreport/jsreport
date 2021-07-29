
import handleHover from './utils/handleHover'
import Swatch from './Swatch'

const PickerSwatch = handleHover(({ hover, color, onClick }) => {
  const styles = {
    swatch: {
      width: '25px',
      height: '25px'
    }
  }

  if (hover) {
    styles.swatch = {
      ...styles.swatch,
      position: 'relative',
      zIndex: '2',
      outline: '2px solid #fff',
      boxShadow: '0 0 5px 2px rgba(0,0,0,0.25)'
    }
  }

  return (
    <div style={styles.swatch}>
      <Swatch color={color} onClick={onClick} />
    </div>
  )
})

const Picker = ({ width, colors, onChange, triangle }) => {
  const styles = {
    card: {
      width,
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.2)',
      boxShadow: '0 3px 12px rgba(0,0,0,0.15)',
      borderRadius: '4px',
      position: 'relative',
      padding: '5px',
      display: 'flex',
      flexWrap: 'wrap'
    }
  }
  const handleChange = (hex, e) => onChange({ hex, source: 'hex' }, e)

  return (
    <div style={styles.card}>
      {colors.map((c) => (
        <PickerSwatch color={c} key={c} onClick={handleChange} />
      ))}
    </div>
  )
}

Picker.defaultProps = {
  width: '200px',
  colors: [
    '#B80000', '#DB3E00', '#FCCB00', '#008B02', '#006B76',
    '#1273DE', '#004DCF', '#5300EB', '#EB9694', '#FAD0C3',
    '#FEF3BD', '#C1E1C5', '#BEDADC', '#C4DEF6'
  ]
}

export default Picker

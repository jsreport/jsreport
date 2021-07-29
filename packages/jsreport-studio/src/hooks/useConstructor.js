import { useRef } from 'react'

export default function useConstructor (cb) {
  const initializedRef = useRef(false)

  if (!initializedRef.current) {
    cb()
    initializedRef.current = true
  }
}

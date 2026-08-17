import { useRef, useState, useCallback, useEffect } from 'react'

/**
 * useSwipeToDismiss
 *
 * Pure touch-event hook for swipe-down-to-dismiss bottom sheets.
 * No external dependencies. Desktop-safe (touch events don't fire with a mouse).
 *
 * Usage:
 *   const { handleRef, dragStyle } = useSwipeToDismiss({ onDismiss: onClose })
 *   <div ref={handleRef}>  ← drag-handle element (header / handle-row)
 *   <div style={dragStyle} ← element that translates
 */
export function useSwipeToDismiss({
  onDismiss,
  dismissThreshold = 80,   // px of downward drag before auto-dismiss on release
  velocityThreshold = 0.5, // px/ms — fast flick overrides distance check
  animationDuration = 0,   // ms to ignore touches after mount (for CSS keyframe anims)
}) {
  const handleRef    = useRef(null)
  const onDismissRef = useRef(onDismiss)   // stable ref avoids listener re-registration
  const mountTimeRef = useRef(Date.now())
  const gestureRef   = useRef(null)        // { startY, startTime, lastY, lastTime }

  const [dragY,      setDragY]      = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isSnapping, setIsSnapping] = useState(false)

  // Keep onDismiss ref fresh without triggering listener re-registration
  useEffect(() => { onDismissRef.current = onDismiss }, [onDismiss])

  // Record mount time so animationDuration gate works on remount too
  useEffect(() => { mountTimeRef.current = Date.now() }, [])

  const onTouchStart = useCallback((e) => {
    if (Date.now() - mountTimeRef.current < animationDuration) return
    const t = e.touches[0]
    gestureRef.current = {
      startY:    t.clientY,
      startTime: Date.now(),
      lastY:     t.clientY,
      lastTime:  Date.now(),
    }
    setIsSnapping(false)
    setDragY(0)
  }, [animationDuration])

  const onTouchMove = useCallback((e) => {
    if (!gestureRef.current) return
    const dy = e.touches[0].clientY - gestureRef.current.startY
    if (dy < 0) {
      // Upward swipe on the handle — abort gesture, don't interfere
      gestureRef.current = null
      return
    }
    gestureRef.current.lastY    = e.touches[0].clientY
    gestureRef.current.lastTime = Date.now()
    setIsDragging(true)
    setDragY(dy)
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!gestureRef.current) return
    const { startY, startTime, lastY, lastTime } = gestureRef.current
    const dy       = lastY - startY
    const elapsed  = lastTime - startTime
    const velocity = elapsed > 0 ? dy / elapsed : 0
    gestureRef.current = null
    setIsDragging(false)

    const shouldDismiss = dy >= dismissThreshold || velocity >= velocityThreshold

    if (shouldDismiss) {
      setDragY(window.innerHeight)  // fly off-screen
      setTimeout(() => onDismissRef.current?.(), 300)
    } else {
      // Snap back to resting position
      setDragY(0)
      setIsSnapping(true)
      setTimeout(() => setIsSnapping(false), 260)
    }
  }, [dismissThreshold, velocityThreshold])

  // Attach raw DOM listeners with { passive: true } to avoid browser scroll warnings
  useEffect(() => {
    const el = handleRef.current
    if (!el) return
    el.addEventListener('touchstart',  onTouchStart, { passive: true })
    el.addEventListener('touchmove',   onTouchMove,  { passive: true })
    el.addEventListener('touchend',    onTouchEnd,   { passive: true })
    el.addEventListener('touchcancel', onTouchEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart',  onTouchStart)
      el.removeEventListener('touchmove',   onTouchMove)
      el.removeEventListener('touchend',    onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [onTouchStart, onTouchMove, onTouchEnd])

  const dragStyle = {
    transform:  dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: isDragging
                  ? 'none'                      // real-time: no transition
                  : isSnapping
                    ? 'transform 0.25s ease'    // snap back
                    : dragY > 0
                      ? 'transform 0.3s ease'   // dismiss fly-off
                      : undefined,
    willChange: isDragging ? 'transform' : undefined,
  }

  return { handleRef, dragStyle, isDragging }
}

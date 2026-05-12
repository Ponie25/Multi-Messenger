import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { MIN_PANE_WIDTH, MIN_PANE_HEIGHT } from '../../shared/constants'

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical'
  onResize: (ratio: number) => void
  parentSize: number
  parentOffset: number
}

export function ResizeHandle({ direction, onResize, parentSize, parentOffset }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const handleRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)

    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      cursor: ${direction === 'horizontal' ? 'col-resize' : 'row-resize'};
    `
    document.body.appendChild(overlay)

    let latestRatio: number | null = null
    let ticking = false

    const flushRatio = () => {
      if (latestRatio !== null) {
        onResize(latestRatio)
        latestRatio = null
      }
      ticking = false
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const container = handleRef.current?.parentElement
      if (!container) return

      const rect = container.getBoundingClientRect()
      const size = direction === 'horizontal' ? rect.width : rect.height
      const offset = direction === 'horizontal' ? rect.left : rect.top
      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY

      const relativePos = currentPos - offset
      const minSize = direction === 'horizontal' ? MIN_PANE_WIDTH : MIN_PANE_HEIGHT
      const minRatio = Math.max(0.1, minSize / size)
      const maxRatio = Math.min(0.9, 1 - minSize / size)
      latestRatio = Math.max(minRatio, Math.min(maxRatio, relativePos / size))

      if (!ticking) {
        ticking = true
        rafRef.current = requestAnimationFrame(flushRatio)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (latestRatio !== null) onResize(latestRatio)
      document.body.removeChild(overlay)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [direction, onResize])

  return (
    <div
      ref={handleRef}
      className={cn(
        'flex-shrink-0 relative z-10',
        direction === 'horizontal' ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize',
      )}
      onMouseDown={handleMouseDown}
    >
      {/* Invisible hit area for easier grabbing */}
      <div
        className={cn(
          'absolute',
          direction === 'horizontal'
            ? 'inset-y-0 -left-1 w-4 cursor-col-resize'
            : 'inset-x-0 -top-1 h-4 cursor-row-resize'
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

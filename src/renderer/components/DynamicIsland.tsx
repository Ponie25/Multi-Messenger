import { useState, useEffect, useRef, useCallback } from 'react'
import type { NotificationItem } from '../types'

type IslandState = 'idle' | 'showing' | 'hovering' | 'dismissing'

interface DynamicIslandProps {
  notifications: NotificationItem[]
  onNotificationClick: (notification: NotificationItem) => void
}

export function DynamicIsland({ notifications, onNotificationClick }: DynamicIslandProps) {
  const [state, setState] = useState<IslandState>('idle')
  const [current, setCurrent] = useState<NotificationItem | null>(null)
  const [queue, setQueue] = useState<NotificationItem[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastProcessedRef = useRef<number>(0)

  // Queue new notifications
  useEffect(() => {
    const newNotifs = notifications.filter((_, i) => i >= lastProcessedRef.current)
    if (newNotifs.length > 0) {
      setQueue((prev) => [...prev, ...newNotifs])
      lastProcessedRef.current = notifications.length
    }
  }, [notifications])

  // Process queue
  useEffect(() => {
    if (state === 'idle' && queue.length > 0) {
      const [next, ...rest] = queue
      setCurrent(next)
      setQueue(rest)
      setState('showing')
    }
  }, [state, queue])

  // Auto-dismiss timer
  useEffect(() => {
    if (state === 'showing') {
      timerRef.current = setTimeout(() => {
        setState('dismissing')
      }, 5000)
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }
    if (state === 'dismissing') {
      const t = setTimeout(() => {
        setCurrent(null)
        setState('idle')
      }, 300)
      return () => clearTimeout(t)
    }
  }, [state])

  const handleMouseEnter = () => {
    if (state === 'showing') {
      if (timerRef.current) clearTimeout(timerRef.current)
      setState('hovering')
    }
  }

  const handleMouseLeave = () => {
    if (state === 'hovering') {
      setState('showing')
    }
  }

  const handleClick = () => {
    if (current) {
      onNotificationClick(current)
      if (timerRef.current) clearTimeout(timerRef.current)
      setCurrent(null)
      setState('idle')
    }
  }

  if (!current) {
    return null
  }

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/10 backdrop-blur-sm
        cursor-pointer max-w-xs transition-all duration-300
        ${state === 'dismissing' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {current.icon && (
        <img src={current.icon} alt="" className="w-4 h-4 rounded-full" />
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium truncate">{current.title}</span>
        {current.body && (
          <span className="text-[10px] text-muted-foreground truncate">{current.body}</span>
        )}
      </div>
    </div>
  )
}

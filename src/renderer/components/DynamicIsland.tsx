import { useState, useEffect, useRef } from 'react'
import type { NotificationItem } from '../types'

type IslandState = 'idle' | 'expanding' | 'showing' | 'hovering' | 'dismissing'

export interface ConfirmRequest {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

interface DynamicIslandProps {
  notifications: NotificationItem[]
  onNotificationClick: (notification: NotificationItem) => void
  confirmRequest?: ConfirmRequest | null
}

export function DynamicIsland({ notifications, onNotificationClick, confirmRequest }: DynamicIslandProps) {
  const [state, setState] = useState<IslandState>('idle')
  const [current, setCurrent] = useState<NotificationItem | null>(null)
  const [queue, setQueue] = useState<NotificationItem[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevLengthRef = useRef<number>(0)

  // Confirm mode state
  const [confirmState, setConfirmState] = useState<'idle' | 'showing' | 'dismissing'>('idle')
  const [activeConfirm, setActiveConfirm] = useState<ConfirmRequest | null>(null)

  // Handle incoming confirm requests
  useEffect(() => {
    if (confirmRequest) {
      // Pause notification display
      if (state === 'showing' || state === 'hovering') {
        if (timerRef.current) clearTimeout(timerRef.current)
        setState('dismissing')
      }
      setActiveConfirm(confirmRequest)
      setConfirmState('showing')
    }
  }, [confirmRequest])

  const handleConfirm = () => {
    activeConfirm?.onConfirm()
    setConfirmState('dismissing')
    setTimeout(() => { setActiveConfirm(null); setConfirmState('idle') }, 300)
  }

  const handleCancel = () => {
    activeConfirm?.onCancel()
    setConfirmState('dismissing')
    setTimeout(() => { setActiveConfirm(null); setConfirmState('idle') }, 300)
  }

  useEffect(() => {
    const newCount = notifications.length - prevLengthRef.current
    if (newCount > 0) {
      const newNotifs = notifications.slice(0, newCount)
      setQueue((prev) => [...prev, ...newNotifs])
    }
    prevLengthRef.current = notifications.length
  }, [notifications])

  useEffect(() => {
    if (state === 'idle' && queue.length > 0 && confirmState === 'idle') {
      const [next, ...rest] = queue
      setCurrent(next)
      setQueue(rest)
      setState('expanding')
    }
  }, [state, queue, confirmState])

  useEffect(() => {
    if (state === 'expanding') {
      const t = setTimeout(() => setState('showing'), 50)
      return () => clearTimeout(t)
    }
    if (state === 'showing') {
      timerRef.current = setTimeout(() => setState('dismissing'), 4500)
      return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    }
    if (state === 'dismissing') {
      const t = setTimeout(() => { setCurrent(null); setState('idle') }, 400)
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
    if (state === 'hovering') setState('showing')
  }

  const handleClick = () => {
    if (current) {
      onNotificationClick(current)
      if (timerRef.current) clearTimeout(timerRef.current)
      setState('dismissing')
    }
  }

  // Render confirm mode
  if (activeConfirm && confirmState !== 'idle') {
    const isShowing = confirmState === 'showing'
    return (
      <div className="relative flex items-center justify-center h-full py-1">
        {/* Glow ring */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            top: '3px',
            bottom: '3px',
            left: '-1px',
            right: '-1px',
            opacity: isShowing ? 1 : 0,
            transition: 'opacity 500ms ease',
            padding: '1.5px',
            background: isShowing
              ? 'conic-gradient(from var(--ring-angle, 0deg), transparent 0%, transparent 88%, hsl(0 72% 51% / 0.6) 93%, hsl(0 72% 51%) 96%, hsl(0 72% 51% / 0.6) 99%, transparent 100%)'
              : 'transparent',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            animation: isShowing ? 'island-ring-spin 3.5s linear infinite' : 'none',
          }}
        />

        {/* Confirm pill */}
        <div
          className="relative flex items-center gap-2 px-3.5 h-7 rounded-full overflow-hidden border border-destructive/40"
          style={{
            background: 'hsl(var(--muted) / 0.8)',
            backdropFilter: 'blur(12px)',
            width: isShowing ? 'clamp(240px, 40vw, 400px)' : '0px',
            opacity: isShowing ? 1 : 0,
            transform: isShowing ? 'scale(1)' : 'scale(0.9)',
            transition: 'all 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <span className="text-[11px] font-medium truncate whitespace-nowrap text-foreground/90 flex-1 min-w-0">
            {activeConfirm.message}
          </span>
          <button
            onClick={handleCancel}
            className="text-[10px] font-medium px-2 py-0.5 rounded-md hover:bg-accent text-muted-foreground flex-shrink-0"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-shrink-0"
          >
            {activeConfirm.confirmLabel || 'Remove'}
          </button>
        </div>
      </div>
    )
  }

  // Render notification mode
  if (!current) return null

  const isVisible = state === 'showing' || state === 'hovering'
  const isDismissing = state === 'dismissing'
  const isExpanding = state === 'expanding'
  const showGlow = isVisible

  return (
    <div
      className="relative flex items-center justify-center h-full py-1"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Lightsaber ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: '3px',
          bottom: '3px',
          left: '-1px',
          right: '-1px',
          opacity: showGlow ? 1 : 0,
          transition: 'opacity 500ms ease',
          padding: '1.5px',
          background: showGlow
            ? 'conic-gradient(from var(--ring-angle, 0deg), transparent 0%, transparent 88%, hsl(var(--primary) / 0.6) 93%, hsl(var(--primary)) 96%, hsl(var(--primary) / 0.6) 99%, transparent 100%)'
            : 'transparent',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          animation: showGlow ? 'island-ring-spin 3.5s linear infinite' : 'none',
        }}
      />

      {/* Content pill */}
      <div
        className="relative flex items-center gap-2 px-3.5 h-7 rounded-full cursor-pointer overflow-hidden border border-border/60"
        style={{
          background: 'hsl(var(--muted) / 0.8)',
          backdropFilter: 'blur(12px)',
          width: isVisible ? 'clamp(220px, 40vw, 480px)' : isDismissing ? '0px' : '36px',
          opacity: isDismissing ? 0 : isExpanding ? 0.5 : 1,
          transform: isDismissing ? 'scale(0.9)' : isExpanding ? 'scale(0.95)' : 'scale(1)',
          transition: 'all 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {current.icon && (
          <img
            src={current.icon}
            alt=""
            className="w-4 h-4 rounded-sm flex-shrink-0 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <span className="text-[11px] font-medium truncate whitespace-nowrap text-foreground/90">
          {current.title}
        </span>
        {current.body && (
          <>
            <span className="text-foreground/25 text-[10px]">·</span>
            <span className="text-[10px] truncate whitespace-nowrap text-muted-foreground flex-1 min-w-0">
              {current.body}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

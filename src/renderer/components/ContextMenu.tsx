import React, { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  accountId: string
  notificationsEnabled: boolean
  onRemove: () => void
  onToggleNotifications: () => void
  onClose: () => void
}

export function ContextMenu({
  x,
  y,
  notificationsEnabled,
  onRemove,
  onToggleNotifications,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)

  // Focus first item on open
  useEffect(() => {
    firstItemRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // Arrow key navigation between menu items
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
        if (!items || items.length === 0) return
        const focused = document.activeElement
        const idx = Array.from(items).indexOf(focused as HTMLButtonElement)
        if (e.key === 'ArrowDown') {
          items[(idx + 1) % items.length].focus()
        } else {
          items[(idx - 1 + items.length) % items.length].focus()
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Adjust position to stay within viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 100),
    left: Math.min(x, window.innerWidth - 200),
    zIndex: 9999,
  }

  return (
    <div
      ref={menuRef}
      style={style}
      className="bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[180px]"
      role="menu"
      aria-label="Account options"
      tabIndex={-1}
    >
      <button
        ref={firstItemRef}
        className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors focus:outline-none focus:bg-accent"
        onClick={() => { onToggleNotifications(); onClose() }}
        role="menuitem"
        data-testid="menu-item-toggle-notifications"
      >
        <span aria-hidden="true">{notificationsEnabled ? '🔕' : '🔔'}</span>
        {' '}
        {notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
      </button>
      <div className="border-t border-border my-1" role="separator" />
      <button
        className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-accent transition-colors focus:outline-none focus:bg-accent"
        onClick={() => { onRemove(); onClose() }}
        role="menuitem"
        data-testid="menu-item-remove-account"
      >
        Remove account
      </button>
    </div>
  )
}

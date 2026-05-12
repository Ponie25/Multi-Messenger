import { useState, useEffect } from 'react'
import { WindowControls } from './WindowControls'
import { DynamicIsland } from './DynamicIsland'
import type { NotificationItem } from '../types'

interface ToolbarProps {
  profileName: string
  notifications: NotificationItem[]
  onNotificationClick: (notification: NotificationItem) => void
}

export function Toolbar({ profileName, notifications, onNotificationClick }: ToolbarProps) {
  const isWindows = navigator.userAgent.includes('Windows')

  return (
    <div
      className="h-9 flex items-center px-3 bg-background border-b border-border select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={() => window.electronAPI.windowMaximize()}
    >
      <div className="flex-shrink-0 text-xs text-muted-foreground font-medium" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {profileName}
      </div>

      <div className="flex-1 flex justify-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <DynamicIsland notifications={notifications} onNotificationClick={onNotificationClick} />
      </div>

      {isWindows && (
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <WindowControls />
        </div>
      )}
    </div>
  )
}

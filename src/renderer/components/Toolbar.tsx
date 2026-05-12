import { useState, useMemo } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { WindowControls } from './WindowControls'
import { DynamicIsland, type ConfirmRequest } from './DynamicIsland'
import { Input } from './ui/input'
import type { NotificationItem } from '../types'

interface ToolbarProps {
  profileName: string
  notifications: NotificationItem[]
  onNotificationClick: (notification: NotificationItem) => void
  onRenameProfile: (name: string) => void
  onRemoveProfile: () => void
}

export function Toolbar({ profileName, notifications, onNotificationClick, onRenameProfile, onRemoveProfile }: ToolbarProps) {
  const isWindows = navigator.userAgent.includes('Windows')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(profileName)
  const [pendingDelete, setPendingDelete] = useState(false)

  const handleStartRename = () => {
    setRenameValue(profileName)
    setIsRenaming(true)
  }

  const handleSubmitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== profileName) {
      onRenameProfile(trimmed)
    }
    setIsRenaming(false)
  }

  const handleCancelRename = () => {
    setIsRenaming(false)
  }

  const confirmRequest: ConfirmRequest | null = useMemo(() => {
    if (!pendingDelete) return null
    return {
      message: `Remove "${profileName}"?`,
      confirmLabel: 'Remove',
      onConfirm: () => {
        onRemoveProfile()
        setPendingDelete(false)
      },
      onCancel: () => {
        setPendingDelete(false)
      },
    }
  }, [pendingDelete, profileName, onRemoveProfile])

  return (
    <div
      className="group/toolbar h-9 flex items-center px-3 bg-background border-b border-border select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={() => window.electronAPI.windowMaximize()}
    >
      <div className="flex-shrink-0 flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {isRenaming ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitRename()
                if (e.key === 'Escape') handleCancelRename()
              }}
              onBlur={handleSubmitRename}
              className="h-6 w-28 text-xs px-1.5 py-0"
            />
            <button onClick={handleSubmitRename} className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
              <Check className="h-3 w-3" />
            </button>
            <button onClick={handleCancelRename} className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
            <span className="text-xs text-muted-foreground font-medium">{profileName}</span>
            <button
              onClick={handleStartRename}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover/toolbar:opacity-100 transition-opacity"
              aria-label="Rename profile"
              title="Rename profile"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() => setPendingDelete(true)}
              className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover/toolbar:opacity-100 transition-opacity"
              aria-label="Remove profile"
              title="Remove profile"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </>
        )}
      </div>

      <div className="flex-1 flex justify-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <DynamicIsland
          notifications={notifications}
          onNotificationClick={onNotificationClick}
          confirmRequest={confirmRequest}
        />
      </div>

      {isWindows && (
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <WindowControls />
        </div>
      )}
    </div>
  )
}

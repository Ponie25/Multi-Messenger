import { useState, useEffect, useRef, useMemo } from 'react'
import { Pencil, Trash2, Check, X, MoreHorizontal, Music, Settings } from 'lucide-react'
import { WindowControls } from './WindowControls'
import { DynamicIsland, type ConfirmRequest } from './DynamicIsland'
import { Input } from './ui/input'
import type { MediaState, NotificationItem } from '../types'

interface ToolbarProps {
  profileName: string
  notifications: NotificationItem[]
  onNotificationClick: (notification: NotificationItem) => void
  onRenameProfile: (name: string) => void
  onRemoveProfile: () => void
  adblockEnabled: boolean
  onAdblockToggle: (enabled: boolean) => void
  onSettingsClick: () => void
  mediaState: MediaState | null
  onMediaFocus: () => void
}

function MusicControls({
  mediaState,
  onMediaFocus,
}: {
  mediaState: MediaState | null
  onMediaFocus: () => void
}) {
  if (!mediaState) return null

  return (
    <div className="hidden max-w-[360px] items-center gap-1.5 sm:flex">
      <button
        className="flex min-w-0 max-w-48 items-center gap-2 rounded-md px-1 py-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={onMediaFocus}
        aria-label="Open playing tab"
        title="Open playing tab"
      >
        <Music className="size-3.5 flex-shrink-0" />
        <span className="truncate text-[11px] font-medium text-foreground">
          {mediaState.title}
        </span>
      </button>
    </div>
  )
}

export function Toolbar({
  profileName,
  notifications,
  onNotificationClick,
  onRenameProfile,
  onRemoveProfile,
  adblockEnabled,
  onAdblockToggle,
  onSettingsClick,
  mediaState,
  onMediaFocus,
}: ToolbarProps) {
  const isWindows = navigator.userAgent.includes('Windows')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(profileName)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!settingsOpen) return
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [settingsOpen])

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
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label="Settings"
            title="Settings"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          {settingsOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-border bg-popover shadow-md p-1">
              <button
                className="flex h-8 w-full items-center gap-2 rounded-md px-3 text-left text-xs text-foreground hover:bg-accent"
                onClick={() => {
                  setSettingsOpen(false)
                  onSettingsClick()
                }}
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                Settings
              </button>
              <div
                className="flex items-center justify-between px-3 h-8 rounded-md hover:bg-accent cursor-pointer select-none"
                onClick={() => onAdblockToggle(!adblockEnabled)}
              >
                <span className="text-xs text-foreground">Ad Blocking</span>
                <div className={`relative w-7 h-4 rounded-full transition-colors ${adblockEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                  <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${adblockEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </div>
          )}
        </div>

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

      <div className="flex flex-shrink-0 items-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <MusicControls mediaState={mediaState} onMediaFocus={onMediaFocus} />
      </div>

      {isWindows && (
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <WindowControls />
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { cn } from '../lib/utils'

interface AccountAvatarProps {
  name: string
  avatarUrl: string
  isActive: boolean
  badgeCount: number
  notificationsEnabled: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function AccountAvatar({
  name,
  avatarUrl,
  isActive,
  badgeCount,
  notificationsEnabled,
  onClick,
  onContextMenu,
}: AccountAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const showImage = avatarUrl && !imgError

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
          : "hover:ring-2 hover:ring-muted-foreground/50 hover:ring-offset-2 hover:ring-offset-background"
      )}
      aria-label={`${name}${badgeCount > 0 ? `, ${badgeCount} unread` : ''}${!notificationsEnabled ? ', notifications muted' : ''}`}
      aria-current={isActive ? 'true' : undefined}
      title={name}
    >
      <Avatar className="w-full h-full">
        {showImage ? (
          <AvatarImage
            src={avatarUrl}
            alt={name}
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : null}
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold select-none">
          {getInitials(name) || '?'}
        </AvatarFallback>
      </Avatar>

      {/* Unread badge */}
      {badgeCount > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none"
          aria-hidden="true"
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}

      {/* Mute icon */}
      {!notificationsEnabled && (
        <span
          className="absolute -bottom-1 -right-1 w-4 h-4 bg-muted rounded-full flex items-center justify-center"
          aria-hidden="true"
          title="Notifications muted"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3 text-muted-foreground fill-current">
            <path d="M8 1a5 5 0 0 0-5 5v1H2a1 1 0 0 0 0 2h.5l.5 4h10l.5-4H14a1 1 0 0 0 0-2h-1V6a5 5 0 0 0-5-5zm0 13a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2z" />
            <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </button>
  )
}

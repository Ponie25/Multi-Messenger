import React from 'react'
import { Avatar, AvatarFallback } from './ui/avatar'
import { cn } from '../lib/utils'

interface ProfileAvatarProps {
  name: string
  isActive: boolean
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

function truncateName(name: string, max: number = 6): string {
  return name.length > max ? name.slice(0, max) + '…' : name
}

export function ProfileAvatar({
  name,
  isActive,
  onClick,
  onContextMenu,
}: ProfileAvatarProps) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'relative flex flex-col items-center gap-1 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1',
      )}
      aria-label={name}
      aria-current={isActive ? 'true' : undefined}
      title={name}
    >
      <Avatar className={cn(
        'w-9 h-9',
        isActive && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
      )}>
        <AvatarFallback className="bg-muted text-foreground text-xs font-medium select-none">
          {getInitials(name) || '?'}
        </AvatarFallback>
      </Avatar>
      <span className="text-[10px] text-muted-foreground leading-tight max-w-[56px] truncate">
        {truncateName(name)}
      </span>
    </button>
  )
}

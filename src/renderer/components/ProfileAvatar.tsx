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
        'relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
          : 'hover:ring-2 hover:ring-muted-foreground/50 hover:ring-offset-2 hover:ring-offset-background'
      )}
      aria-label={name}
      aria-current={isActive ? 'true' : undefined}
      title={name}
    >
      <Avatar className="w-full h-full">
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold select-none">
          {getInitials(name) || '?'}
        </AvatarFallback>
      </Avatar>
    </button>
  )
}

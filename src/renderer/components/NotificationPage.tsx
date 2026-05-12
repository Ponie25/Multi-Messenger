import { Bell, CheckCheck } from 'lucide-react'
import type { NotificationItem } from '../types'
import { cn } from '../lib/utils'

interface NotificationPageProps {
  notifications: NotificationItem[]
  onNotificationClick: (notification: NotificationItem) => void
  onMarkAllRead: () => void
}

export function NotificationPage({ notifications, onNotificationClick, onMarkAllRead }: NotificationPageProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Bell className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No notifications yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-medium">Notifications</h2>
        <button
          onClick={onMarkAllRead}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all as read
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {notifications.map((notification) => (
          <NotificationItemRow
            key={notification.id}
            notification={notification}
            onClick={() => onNotificationClick(notification)}
          />
        ))}
      </div>
    </div>
  )
}

function NotificationItemRow({
  notification,
  onClick,
}: {
  notification: NotificationItem
  onClick: () => void
}) {
  const timeAgo = getRelativeTime(notification.timestamp)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50',
        !notification.read && 'bg-primary/5'
      )}
    >
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
      )}
      {notification.read && <div className="w-2 flex-shrink-0" />}
      {notification.icon && (
        <img src={notification.icon} alt="" className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', !notification.read && 'font-medium')}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{notification.body}</p>
        )}
        <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo}</p>
      </div>
    </button>
  )
}

function getRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

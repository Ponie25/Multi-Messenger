import { useReducer, useCallback } from 'react'
import type { NotificationItem } from '../types'

type NotificationAction =
  | { type: 'add'; notification: NotificationItem }
  | { type: 'markRead'; id: string }
  | { type: 'markAllRead' }
  | { type: 'clear' }

function notificationReducer(state: NotificationItem[], action: NotificationAction): NotificationItem[] {
  switch (action.type) {
    case 'add':
      return [action.notification, ...state]
    case 'markRead':
      return state.map((n) => (n.id === action.id ? { ...n, read: true } : n))
    case 'markAllRead':
      return state.map((n) => ({ ...n, read: true }))
    case 'clear':
      return []
    default:
      return state
  }
}

export function useNotifications() {
  const [notifications, dispatch] = useReducer(notificationReducer, [])

  const addNotification = useCallback((notification: NotificationItem) => {
    dispatch({ type: 'add', notification })
  }, [])

  const markRead = useCallback((id: string) => {
    dispatch({ type: 'markRead', id })
  }, [])

  const markAllRead = useCallback(() => {
    dispatch({ type: 'markAllRead' })
  }, [])

  const clear = useCallback(() => {
    dispatch({ type: 'clear' })
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    unreadCount,
    addNotification,
    markRead,
    markAllRead,
    clear,
  }
}

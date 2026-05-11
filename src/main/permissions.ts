import { session } from 'electron'

/**
 * Sets the notification permission handler for a given session partition.
 * When enabled, notification requests are automatically granted.
 * When disabled, notification requests are denied.
 */
export function setNotificationPermission(partition: string, enabled: boolean): void {
  const accountSession = session.fromPartition(partition)
  accountSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'notifications') {
      callback(enabled)
    } else {
      // Deny all other permission requests by default
      callback(false)
    }
  })
}

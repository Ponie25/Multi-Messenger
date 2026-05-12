// Preload for pane WebContentsViews
// Intercepts Web Notification API and forwards to main process
import { ipcRenderer } from 'electron'

// Override Notification constructor to intercept and forward
const OriginalNotification = window.Notification

class InterceptedNotification extends OriginalNotification {
  constructor(title: string, options?: NotificationOptions) {
    super(title, options)
    ipcRenderer.send('pane:notification', {
      title,
      body: options?.body || '',
      icon: options?.icon || undefined,
    })
  }
}

// Preserve static properties
Object.defineProperty(InterceptedNotification, 'permission', {
  get: () => OriginalNotification.permission,
})
InterceptedNotification.requestPermission = OriginalNotification.requestPermission.bind(OriginalNotification)

;(window as any).Notification = InterceptedNotification

// Override ServiceWorkerRegistration.showNotification
if ('serviceWorker' in navigator) {
  const originalShowNotification = ServiceWorkerRegistration.prototype.showNotification
  ServiceWorkerRegistration.prototype.showNotification = function (
    title: string,
    options?: NotificationOptions
  ): Promise<void> {
    ipcRenderer.send('pane:notification', {
      title,
      body: options?.body || '',
      icon: options?.icon || undefined,
    })
    return originalShowNotification.call(this, title, options)
  }
}

// Preload for pane WebContentsViews
// Listens for notification messages from the page's main world (injected via executeJavaScript)
// and forwards them to the main process via IPC.
import { ipcRenderer } from 'electron'

// Listen for postMessage from the injected notification override in the page's main world
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === '__electron_notification__') {
    ipcRenderer.send('pane:notification', {
      title: event.data.title,
      body: event.data.body,
      icon: event.data.icon || undefined,
    })
  }
})

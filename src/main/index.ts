import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import path from 'path'
import { AccountStore } from './store'
import { ViewManager } from './view-manager'
import { setNotificationPermission } from './permissions'

// Use Node.js built-in crypto.randomUUID() — available in Node 14.17+ / Electron 30
const { randomUUID } = require('crypto') as { randomUUID: () => string }

let mainWindow: BrowserWindow | null = null
let viewManager: ViewManager | null = null
const accountStore = new AccountStore()

const SIDEBAR_WIDTH = 72
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/shell.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  viewManager = new ViewManager(mainWindow, SIDEBAR_WIDTH)

  // Task 2.3 — resize listener
  mainWindow.on('resize', () => {
    viewManager?.updateActiveBounds()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    viewManager = null
  })
}

app.whenReady().then(async () => {
  createWindow()

  // Task 4.5 — create WebContentsViews for all persisted accounts on startup
  const accounts = accountStore.getAll()
  for (const account of accounts) {
    await viewManager!.createView(account)
  }
  if (accounts.length > 0) {
    viewManager!.showView(accounts[0].id)
  }

  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Task 2.4 — IPC handlers
function registerIpcHandlers() {
  // Get all accounts (pull pattern — renderer requests on mount)
  ipcMain.handle('accounts:get', () => accountStore.getAll())

  // Add account
  ipcMain.handle('account:add', async () => {
    if (!viewManager) return null
    const accounts = accountStore.getAll()
    const newAccount = {
      id: randomUUID(),
      name: `Account ${accounts.length + 1}`,
      avatarUrl: '',
      notificationsEnabled: true,
      order: accounts.length,
    }
    accountStore.add(newAccount)
    await viewManager.createView(newAccount)
    viewManager.showView(newAccount.id)
    return newAccount
  })

  // Switch account
  ipcMain.handle('account:switch', (_event, accountId: string) => {
    if (!viewManager) return { success: false }
    viewManager.showView(accountId)
    return { success: true }
  })

  // Remove account
  ipcMain.handle('account:remove', async (_event, accountId: string) => {
    if (!viewManager || !mainWindow) return { success: false }
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Remove'],
      defaultId: 0,
      cancelId: 0,
      message: 'Remove this account? This will clear its session.',
    })
    if (result.response === 1) {
      await viewManager.destroyView(accountId)
      accountStore.remove(accountId)
      const remaining = accountStore.getAll()
      if (remaining.length > 0) {
        viewManager.showView(remaining[0].id)
      }
      return { success: true, remaining }
    }
    return { success: false }
  })

  // Toggle notifications
  ipcMain.handle('account:toggleNotifications', (_event, accountId: string, enabled: boolean) => {
    accountStore.update(accountId, { notificationsEnabled: enabled })
    const partition = `persist:account-${accountId}`
    setNotificationPermission(partition, enabled)
    return { success: true }
  })

  // Reorder accounts
  ipcMain.handle('account:reorder', (_event, orderedIds: unknown) => {
    if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === 'string')) {
      return { success: false }
    }
    accountStore.reorder(orderedIds as string[])
    return { success: true }
  })

  // Badge update from preload
  ipcMain.on('ipc:badge-update', (_event, data: { accountId: string; count: number }) => {
    mainWindow?.webContents.send('badge:update', data)
  })

  // Account info from preload
  ipcMain.on('ipc:account-info', (_event, data: { accountId: string; name: string; avatarUrl: string }) => {
    accountStore.update(data.accountId, { name: data.name, avatarUrl: data.avatarUrl })
    mainWindow?.webContents.send('account:infoUpdated', data)
  })

  // Notification click — focus window and switch account
  ipcMain.on('notification:click', (_event, accountId: string) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      viewManager?.showView(accountId)
      mainWindow.webContents.send('account:switch', accountId)
    }
  })

  // Sidebar resize — right sidebar opened/closed
  ipcMain.on('sidebar:resize', (_event, data: { rightSidebarWidth: number }) => {
    viewManager?.setRightSidebarWidth(data.rightSidebarWidth)
  })

  // Native context menu for account actions
  ipcMain.handle('account:contextMenu', (_event, _accountId: string, notificationsEnabled: boolean) => {
    return new Promise<{ action: string | null }>((resolve) => {
      const menu = Menu.buildFromTemplate([
        {
          label: notificationsEnabled ? 'Disable notifications' : 'Enable notifications',
          click: () => resolve({ action: 'toggleNotifications' }),
        },
        { type: 'separator' },
        {
          label: 'Remove account',
          click: () => resolve({ action: 'remove' }),
        },
      ])
      menu.popup({
        window: mainWindow!,
        callback: () => resolve({ action: null }),
      })
    })
  })

  // Quick Text CRUD
  ipcMain.handle('quicktext:getAll', () => accountStore.getAllQuickTexts())

  ipcMain.handle('quicktext:add', (_event, label: string, text: string) => {
    const id = randomUUID()
    return accountStore.addQuickText(id, label, text)
  })

  ipcMain.handle('quicktext:update', (_event, id: string, data: Partial<{ label: string; text: string }>) => {
    accountStore.updateQuickText(id, data)
  })

  ipcMain.handle('quicktext:remove', (_event, id: string) => {
    accountStore.removeQuickText(id)
  })

  // Quick Text injection into active WebContentsView
  ipcMain.handle('quicktext:inject', async (_event, text: string) => {
    if (!viewManager) return { success: false, error: 'No view manager' }
    const activeId = viewManager.getActiveAccountId()
    if (!activeId) return { success: false, error: 'No active account' }
    const view = viewManager.getView(activeId)
    if (!view) return { success: false, error: 'No active view' }

    try {
      const result = await view.webContents.executeJavaScript(`
        (function() {
          const el = document.querySelector('[contenteditable="true"][role="textbox"]')
            || document.querySelector('[contenteditable][role="textbox"]')
            || document.querySelector('div[contenteditable="true"]');
          if (!el) return { success: false, error: 'Could not find chat input' };
          el.focus();
          el.textContent = ${JSON.stringify(text)};
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ${JSON.stringify(text)} }));
          return { success: true };
        })()
      `)
      return result
    } catch (err: any) {
      return { success: false, error: err.message || 'Injection failed' }
    }
  })
}

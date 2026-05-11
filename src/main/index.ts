import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import path from 'path'
import { ProfileStore } from './store'
import { ViewManager } from './view-manager'

const { randomUUID } = require('crypto') as { randomUUID: () => string }

let mainWindow: BrowserWindow | null = null
let viewManager: ViewManager | null = null
const profileStore = new ProfileStore()

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
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
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  viewManager = new ViewManager(mainWindow)

  // Push navigation events to renderer
  viewManager.setUrlChangedHandler((profileId, paneId, url) => {
    mainWindow?.webContents.send('pane:urlChanged', { profileId, paneId, url })
  })
  viewManager.setNavStateHandler((profileId, paneId, canGoBack, canGoForward) => {
    mainWindow?.webContents.send('pane:navState', { profileId, paneId, canGoBack, canGoForward })
  })

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

  const profiles = profileStore.getAll()
  for (const profile of profiles) {
    await viewManager!.createProfile(profile)
  }
  if (profiles.length > 0) {
    viewManager!.showProfile(profiles[0].id)
  }

  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

function registerIpcHandlers() {
  ipcMain.handle('profiles:get', () => profileStore.getAll())

  ipcMain.handle('profile:add', async () => {
    if (!viewManager) return null
    const profiles = profileStore.getAll()
    const paneId = randomUUID()
    const newProfile = {
      id: randomUUID(),
      name: `Profile ${profiles.length + 1}`,
      order: profiles.length,
      panes: [{ id: paneId, url: '' }],
      activePaneId: paneId,
    }
    profileStore.add(newProfile)
    await viewManager.createProfile(newProfile)
    viewManager.showProfile(newProfile.id)
    return newProfile
  })

  ipcMain.handle('profile:switch', (_event, profileId: string) => {
    if (!viewManager) return { success: false }
    viewManager.showProfile(profileId)
    return { success: true }
  })

  ipcMain.handle('profile:remove', async (_event, profileId: string) => {
    if (!viewManager || !mainWindow) return { success: false }
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Remove'],
      defaultId: 0,
      cancelId: 0,
      message: 'Remove this profile? This will clear all its data.',
    })
    if (result.response === 1) {
      await viewManager.destroyProfile(profileId)
      profileStore.remove(profileId)
      const remaining = profileStore.getAll()
      if (remaining.length > 0) {
        viewManager.showProfile(remaining[0].id)
      }
      return { success: true, remaining }
    }
    return { success: false }
  })

  ipcMain.handle('profile:rename', (_event, profileId: string, name: string) => {
    profileStore.update(profileId, { name })
  })

  ipcMain.handle('profile:reorder', (_event, orderedIds: unknown) => {
    if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === 'string')) {
      return { success: false }
    }
    profileStore.reorder(orderedIds as string[])
    return { success: true }
  })

  ipcMain.handle('profile:contextMenu', (_event, _profileId: string) => {
    return new Promise<{ action: string | null }>((resolve) => {
      const menu = Menu.buildFromTemplate([
        {
          label: 'Rename',
          click: () => resolve({ action: 'rename' }),
        },
        { type: 'separator' },
        {
          label: 'Remove',
          click: () => resolve({ action: 'remove' }),
        },
      ])
      menu.popup({
        window: mainWindow!,
        callback: () => resolve({ action: null }),
      })
    })
  })

  // Pane handlers
  ipcMain.handle('pane:navigate', (_event, profileId: string, paneId: string, url: string) => {
    if (!viewManager) return
    viewManager.navigatePane(profileId, paneId, url)
    profileStore.updatePane(profileId, paneId, { url })
  })

  ipcMain.handle('pane:add', (_event, profileId: string) => {
    if (!viewManager) return null
    const pane = { id: randomUUID(), url: '' }
    const added = profileStore.addPane(profileId, pane)
    if (!added) return null
    viewManager.addPane(profileId, pane)
    return pane
  })

  ipcMain.handle('pane:remove', async (_event, profileId: string, paneId: string) => {
    if (!viewManager) return { success: false }
    await viewManager.removePane(profileId, paneId)
    profileStore.removePane(profileId, paneId)
    return { success: true }
  })

  ipcMain.handle('pane:setActive', (_event, profileId: string, paneId: string) => {
    profileStore.update(profileId, { activePaneId: paneId })
  })

  ipcMain.handle('pane:goBack', (_event, profileId: string, paneId: string) => {
    viewManager?.goBack(profileId, paneId)
  })

  ipcMain.handle('pane:goForward', (_event, profileId: string, paneId: string) => {
    viewManager?.goForward(profileId, paneId)
  })
}

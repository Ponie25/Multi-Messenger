import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import path from 'path'
import { ProfileStore } from './store'
import { ViewManager } from './view-manager'
import type { SplitNode } from '../shared/types'

const { randomUUID } = require('crypto') as { randomUUID: () => string }

let mainWindow: BrowserWindow | null = null
let viewManager: ViewManager | null = null
const profileStore = new ProfileStore()

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  const isWin = process.platform === 'win32'
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: isWin ? false : undefined,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
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
  viewManager.setNotificationHandler((profileId, paneId, title, body, icon) => {
    mainWindow?.webContents.send('notification:received', { profileId, paneId, title, body, icon })
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
    viewManager!.showProfile(profiles[0].id, profiles[0].splitTree)
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
      splitTree: { type: 'leaf' as const, paneId },
      activePaneId: paneId,
    }
    profileStore.add(newProfile)
    await viewManager.createProfile(newProfile)
    viewManager.showProfile(newProfile.id)
    return newProfile
  })

  ipcMain.handle('profile:switch', (_event, profileId: string) => {
    if (!viewManager) return { success: false }
    const profile = profileStore.getProfile(profileId)
    viewManager.showProfile(profileId, profile?.splitTree)
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

  ipcMain.handle('pane:add', (_event, profileId: string, targetPaneId: string, direction: string) => {
    if (!viewManager) return null
    const pane = { id: randomUUID(), url: '' }
    const added = profileStore.addPane(profileId, pane, targetPaneId, direction as any)
    if (!added) return null
    const profile = profileStore.getProfile(profileId)
    viewManager.addPane(profileId, pane, profile?.splitTree)
    return pane
  })

  ipcMain.handle('pane:remove', async (_event, profileId: string, paneId: string) => {
    if (!viewManager) return { success: false }
    await viewManager.removePane(profileId, paneId)
    profileStore.removePane(profileId, paneId)
    const profile = profileStore.getProfile(profileId)
    if (profile) {
      viewManager.updateBoundsFromTree(profileId, profile.splitTree)
    }
    return { success: true }
  })

  ipcMain.handle('pane:swap', (_event, profileId: string, paneIdA: string, paneIdB: string) => {
    const success = profileStore.swapPanes(profileId, paneIdA, paneIdB)
    if (success && viewManager) {
      const profile = profileStore.getProfile(profileId)
      if (profile) {
        viewManager.updateBoundsFromTree(profileId, profile.splitTree)
      }
    }
    return { success }
  })

  ipcMain.handle('pane:updateRatio', (_event, profileId: string, path: number[], ratio: number) => {
    profileStore.updateSplitRatioByPath(profileId, path, ratio)
    const profile = profileStore.getProfile(profileId)
    if (profile && viewManager) {
      viewManager.updateBoundsFromTree(profileId, profile.splitTree)
    }
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

  ipcMain.handle('pane:reload', (_event, profileId: string, paneId: string) => {
    viewManager?.reloadPane(profileId, paneId)
  })

  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

  // View management
  ipcMain.on('view:hideAll', () => {
    viewManager?.hideAllViews()
  })
  ipcMain.on('view:showProfile', (_event, profileId: string) => {
    if (!viewManager) return
    const profile = profileStore.getProfile(profileId)
    if (profile) {
      viewManager.showProfile(profileId, profile.splitTree)
    }
  })

  // Quick Text CRUD
  ipcMain.handle('quicktext:getAll', () => profileStore.getAllQuickTexts())

  ipcMain.handle('quicktext:add', (_event, label: string, text: string) => {
    const id = randomUUID()
    return profileStore.addQuickText(id, label, text)
  })

  ipcMain.handle('quicktext:update', (_event, id: string, data: Partial<{ label: string; text: string }>) => {
    profileStore.updateQuickText(id, data)
  })

  ipcMain.handle('quicktext:remove', (_event, id: string) => {
    profileStore.removeQuickText(id)
  })

  // Quick Text injection into active pane
  ipcMain.handle('quicktext:inject', async (_event, text: string) => {
    if (!viewManager) return { success: false, error: 'No view manager' }
    const view = viewManager.getActivePaneView()
    if (!view) return { success: false, error: 'No active pane' }

    try {
      const result = await view.webContents.executeJavaScript(`
        (function() {
          const el = document.querySelector('[contenteditable="true"][role="textbox"]')
            || document.querySelector('[contenteditable][role="textbox"]')
            || document.querySelector('div[contenteditable="true"]')
            || document.querySelector('textarea')
            || document.querySelector('input[type="text"]');
          if (!el) return { success: false, error: 'Could not find text input' };
          el.focus();
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.value = ${JSON.stringify(text)};
            el.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            el.textContent = ${JSON.stringify(text)};
            el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ${JSON.stringify(text)} }));
          }
          return { success: true };
        })()
      `)
      return result
    } catch (err: any) {
      return { success: false, error: err.message || 'Injection failed' }
    }
  })
}

import { app, BrowserWindow, ipcMain, Menu, session as electronSession } from 'electron'
import path from 'path'
import { ProfileStore } from './store'
import { ViewManager } from './view-manager'
import { initAdBlocker, buildAdBlocker, replaceAdBlocker, enableBlockingForAllProfiles, enableBlockingForSession, disableBlockingForAllProfiles, disableBlockingForSession, isAdBlockerReady } from './adblocker'
import type { SplitNode } from '../shared/types'

const { randomUUID } = require('crypto') as { randomUUID: () => string }

let mainWindow: BrowserWindow | null = null
let viewManager: ViewManager | null = null
const profileStore = new ProfileStore()
let adblockApplyVersion = 0
let adblockApplyRunning = false
let adblockApplyQueued = false

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

async function applyCurrentAdblockSettings(): Promise<void> {
  const applyVersion = ++adblockApplyVersion
  const settings = profileStore.getSettings()
  const profiles = profileStore.getAll()
  const profileIds = profiles.map((p) => p.id)

  if (!settings.adblockEnabled) {
    disableBlockingForAllProfiles(profileIds)
    return
  }

  const nextBlocker = await buildAdBlocker(settings.adblockFilterIds)
  if (applyVersion !== adblockApplyVersion) return
  if (!nextBlocker) return

  disableBlockingForAllProfiles(profileIds)
  replaceAdBlocker(nextBlocker)
  enableBlockingForAllProfiles(profileIds)
}

function queueAdblockApply(): void {
  adblockApplyQueued = true
  if (adblockApplyRunning) return

  adblockApplyRunning = true
  void (async () => {
    try {
      while (adblockApplyQueued) {
        adblockApplyQueued = false
        await applyCurrentAdblockSettings()
      }
    } catch (err) {
      console.error('[adblocker] Failed to apply settings:', err)
    } finally {
      adblockApplyRunning = false
      if (adblockApplyQueued) queueAdblockApply()
    }
  })()
}

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

  // Increase max listeners — multiple pane views send events through the main webContents
  mainWindow.webContents.setMaxListeners(30)

  viewManager = new ViewManager(mainWindow)

  // Push navigation events to renderer (now include tabId)
  viewManager.setUrlChangedHandler((profileId, paneId, tabId, url) => {
    mainWindow?.webContents.send('pane:urlChanged', { profileId, paneId, tabId, url })
  })
  viewManager.setNavStateHandler((profileId, paneId, tabId, canGoBack, canGoForward) => {
    mainWindow?.webContents.send('pane:navState', { profileId, paneId, tabId, canGoBack, canGoForward })
  })
  viewManager.setNotificationHandler((profileId, paneId, title, body, icon) => {
    mainWindow?.webContents.send('notification:received', { profileId, paneId, title, body, icon })
  })
  viewManager.setMediaStateHandler((state) => {
    mainWindow?.webContents.send('media:state', state)
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
  registerIpcHandlers()

  const profiles = profileStore.getAll()

  for (const profile of profiles) {
    await viewManager!.createProfile(profile)
  }
  if (profiles.length > 0) {
    viewManager!.showProfile(profiles[0].id, profiles[0].splitTree)
  }

  // Initialize ad blocker only if enabled in settings
  const settings = profileStore.getSettings()
  if (settings.adblockEnabled) {
    initAdBlocker(settings.adblockFilterIds).then(() => {
      enableBlockingForAllProfiles(profiles.map((p) => p.id))
    }).catch(() => {})
  }
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
    const tabId = randomUUID()
    const newProfile = {
      id: randomUUID(),
      name: `Profile ${profiles.length + 1}`,
      order: profiles.length,
      panes: [{ id: paneId, tabs: [{ id: tabId, url: '' }], activeTabId: tabId }],
      splitTree: { type: 'leaf' as const, paneId },
      activePaneId: paneId,
    }
    profileStore.add(newProfile)

    // Enable ad blocking on the new profile's session if adblock is enabled
    const settings = profileStore.getSettings()
    if (settings.adblockEnabled) {
      const partition = `persist:profile-${newProfile.id}`
      const profileSession = electronSession.fromPartition(partition)
      if (!isAdBlockerReady()) {
        await initAdBlocker(settings.adblockFilterIds)
      }
      try { enableBlockingForSession(profileSession, partition) } catch {}
    }

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
    await viewManager.destroyProfile(profileId)
    const partition = `persist:profile-${profileId}`
    disableBlockingForSession(electronSession.fromPartition(partition), partition)
    profileStore.remove(profileId)
    const remaining = profileStore.getAll()
    if (remaining.length > 0) {
      viewManager.showProfile(remaining[0].id)
    }
    return { success: true, remaining }
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
  ipcMain.handle('pane:navigate', (_event, profileId: string, paneId: string, tabId: string, url: string) => {
    if (!viewManager) return
    viewManager.navigateTab(profileId, paneId, tabId, url)
    profileStore.updateTab(profileId, paneId, tabId, { url })
  })

  ipcMain.handle('pane:add', (_event, profileId: string, targetPaneId: string, direction: string) => {
    if (!viewManager) return null
    const tabId = randomUUID()
    const pane = { id: randomUUID(), tabs: [{ id: tabId, url: '' }], activeTabId: tabId }
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

  ipcMain.handle('pane:goBack', (_event, profileId: string, paneId: string, tabId: string) => {
    viewManager?.goBack(profileId, paneId, tabId)
  })

  ipcMain.handle('pane:goForward', (_event, profileId: string, paneId: string, tabId: string) => {
    viewManager?.goForward(profileId, paneId, tabId)
  })

  ipcMain.handle('pane:reload', (_event, profileId: string, paneId: string, tabId: string) => {
    viewManager?.reloadTab(profileId, paneId, tabId)
  })

  // Tab handlers
  ipcMain.handle('tab:add', (_event, profileId: string, paneId: string) => {
    if (!viewManager) return null
    const tab = profileStore.addTab(profileId, paneId)
    if (!tab) return null
    viewManager.addTab(profileId, paneId, tab)
    viewManager.setActiveTab(profileId, paneId, tab.id)
    return tab
  })

  ipcMain.handle('tab:remove', async (_event, profileId: string, paneId: string, tabId: string) => {
    if (!viewManager) return { success: false }
    const result = profileStore.removeTab(profileId, paneId, tabId)
    viewManager.removeTab(profileId, paneId, tabId)
    if (result.removedPane) {
      const profile = profileStore.getProfile(profileId)
      if (profile) {
        viewManager.updateBoundsFromTree(profileId, profile.splitTree)
      }
    } else {
      // Update active tab in view manager
      const profile = profileStore.getProfile(profileId)
      const pane = profile?.panes.find((p) => p.id === paneId)
      if (pane) {
        viewManager.setActiveTab(profileId, paneId, pane.activeTabId)
      }
    }
    return { success: true, removedPane: result.removedPane }
  })

  ipcMain.handle('tab:setActive', (_event, profileId: string, paneId: string, tabId: string) => {
    if (!viewManager) return
    profileStore.setActiveTab(profileId, paneId, tabId)
    viewManager.setActiveTab(profileId, paneId, tabId)
  })

  ipcMain.handle('tab:move', (_event, profileId: string, fromPaneId: string, tabId: string, toPaneId: string) => {
    if (!viewManager) return { success: false }
    const result = profileStore.moveTab(profileId, fromPaneId, tabId, toPaneId)
    viewManager.moveTab(profileId, fromPaneId, tabId, toPaneId)
    // Update active tabs
    const profile = profileStore.getProfile(profileId)
    if (profile) {
      const toPane = profile.panes.find((p) => p.id === toPaneId)
      if (toPane) viewManager.setActiveTab(profileId, toPaneId, toPane.activeTabId)
      const fromPane = profile.panes.find((p) => p.id === fromPaneId)
      if (fromPane) viewManager.setActiveTab(profileId, fromPaneId, fromPane.activeTabId)
      if (result.removedPane) {
        viewManager.updateBoundsFromTree(profileId, profile.splitTree)
      }
    }
    return { success: true, removedPane: result.removedPane }
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

  // Settings handlers
  ipcMain.handle('settings:get', () => profileStore.getSettings())

  ipcMain.handle('settings:setAdblock', async (_event, enabled: boolean) => {
    profileStore.updateSettings({ adblockEnabled: enabled })
    const settings = profileStore.getSettings()
    queueAdblockApply()
    return { success: true, settings }
  })

  ipcMain.handle('settings:setAdblockFilters', async (_event, filterIds: unknown) => {
    const nextFilterIds = Array.isArray(filterIds) ? filterIds.filter((id): id is string => typeof id === 'string') : []
    profileStore.updateSettings({ adblockFilterIds: nextFilterIds })
    const settings = profileStore.getSettings()
    queueAdblockApply()

    return { success: true, settings }
  })

  ipcMain.handle('settings:setAdblockSettings', async (_event, enabled: boolean, filterIds: unknown) => {
    const nextFilterIds = Array.isArray(filterIds) ? filterIds.filter((id): id is string => typeof id === 'string') : []
    profileStore.updateSettings({ adblockEnabled: enabled, adblockFilterIds: nextFilterIds })
    const settings = profileStore.getSettings()
    await applyCurrentAdblockSettings()

    return { success: true, settings }
  })

  // Media controls
  ipcMain.handle('media:getState', () => viewManager?.getMediaState() ?? null)
}

import { useState, useEffect, useCallback, useRef } from 'react'
import { ThemeProvider } from './components/ThemeProvider'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { ContentArea } from './components/ContentArea'
import { NotificationPage } from './components/NotificationPage'
import { PaneDndProvider } from './components/PaneDndContext'
import { useNotifications } from './hooks/useNotifications'
import { updateRatioByPath } from '../shared/split-tree'
import type { Profile, SplitNode, SplitDirection, NotificationItem } from './types'
import './index.css'

type ViewState = 'workspace' | 'notifications'

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  // Keyed by tabId (not paneId) since each tab has its own URL/nav state
  const [tabUrls, setTabUrls] = useState<Record<string, string>>({})
  const [tabNavState, setTabNavState] = useState<Record<string, { canGoBack: boolean; canGoForward: boolean }>>({})
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({})
  const [viewState, setViewState] = useState<ViewState>('workspace')

  const { notifications, unreadCount, addNotification, markRead, markAllRead } = useNotifications()

  useEffect(() => {
    const api = window.electronAPI

    api.getProfiles().then((loaded) => {
      setProfiles(loaded)
      if (loaded.length > 0) {
        setActiveProfileId(loaded[0].id)
      }
    })

    const unsubUrl = api.onPaneUrlChanged(({ tabId, url }) => {
      setTabUrls((prev) => ({ ...prev, [tabId]: url }))
    })

    const unsubNav = api.onPaneNavState(({ tabId, canGoBack, canGoForward }) => {
      setTabNavState((prev) => ({ ...prev, [tabId]: { canGoBack, canGoForward } }))
    })

    const unsubLoading = api.onPaneLoading(({ tabId, loading }) => {
      setTabLoading((prev) => ({ ...prev, [tabId]: loading }))
    })

    const unsubSwitch = api.onProfileSwitch((profileId) => {
      setActiveProfileId(profileId)
    })

    const unsubNotification = api.onNotification(({ profileId, paneId, title, body, icon }) => {
      addNotification({
        id: crypto.randomUUID(),
        profileId,
        paneId,
        title,
        body,
        icon,
        timestamp: Date.now(),
        read: false,
      })
    })

    return () => {
      unsubUrl()
      unsubNav()
      unsubLoading()
      unsubSwitch()
      unsubNotification()
    }
  }, [addNotification])

  const handleAddProfile = useCallback(async () => {
    const newProfile = await window.electronAPI.addProfile()
    if (newProfile) {
      setProfiles((prev) => [...prev, newProfile])
      setActiveProfileId(newProfile.id)
      if (viewState === 'notifications') setViewState('workspace')
    }
  }, [viewState])

  const handleSwitchProfile = useCallback(async (profileId: string) => {
    await window.electronAPI.switchProfile(profileId)
    setActiveProfileId(profileId)
    if (viewState === 'notifications') setViewState('workspace')
  }, [viewState])

  const handleRemoveProfile = useCallback(async (profileId: string) => {
    const result = await window.electronAPI.removeProfile(profileId)
    if (result.success) {
      const remaining = result.remaining ?? []
      setProfiles(remaining)
      if (activeProfileId === profileId) {
        setActiveProfileId(remaining.length > 0 ? remaining[0].id : null)
      }
    }
  }, [activeProfileId])

  const handleRenameProfile = useCallback(async (profileId: string, name: string) => {
    await window.electronAPI.renameProfile(profileId, name)
    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, name } : p))
    )
  }, [])

  const handleReorder = useCallback(async (orderedIds: string[]) => {
    await window.electronAPI.reorderProfiles(orderedIds)
    setProfiles((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]))
      return orderedIds.map((id, index) => ({ ...map.get(id)!, order: index }))
    })
  }, [])

  // Pane handlers
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null

  const handleNavigate = useCallback(async (paneId: string, tabId: string, url: string) => {
    if (!activeProfileId) return
    await window.electronAPI.navigatePane(activeProfileId, paneId, tabId, url)
    setTabUrls((prev) => ({ ...prev, [tabId]: url }))
  }, [activeProfileId])

  const handleSplit = useCallback(async (paneId: string, direction: SplitDirection) => {
    if (!activeProfileId) return
    const pane = await window.electronAPI.addPane(activeProfileId, paneId, direction)
    if (pane) {
      // Refresh profile from store
      const updated = await window.electronAPI.getProfiles()
      setProfiles(updated)
    }
  }, [activeProfileId])

  const handleRemovePane = useCallback(async (paneId: string) => {
    if (!activeProfileId) return
    const result = await window.electronAPI.removePane(activeProfileId, paneId)
    if (result.success) {
      const updated = await window.electronAPI.getProfiles()
      setProfiles(updated)
    }
  }, [activeProfileId])

  const handleSetActivePane = useCallback(async (paneId: string) => {
    if (!activeProfileId) return
    await window.electronAPI.setActivePane(activeProfileId, paneId)
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeProfileId ? { ...p, activePaneId: paneId } : p
      )
    )
  }, [activeProfileId])

  const handleGoBack = useCallback((paneId: string, tabId: string) => {
    if (!activeProfileId) return
    window.electronAPI.goBack(activeProfileId, paneId, tabId)
  }, [activeProfileId])

  const handleGoForward = useCallback((paneId: string, tabId: string) => {
    if (!activeProfileId) return
    window.electronAPI.goForward(activeProfileId, paneId, tabId)
  }, [activeProfileId])

  const handleReload = useCallback((paneId: string, tabId: string) => {
    if (!activeProfileId) return
    window.electronAPI.reloadPane(activeProfileId, paneId, tabId)
  }, [activeProfileId])

  // Tab handlers
  const handleAddTab = useCallback(async (paneId: string) => {
    if (!activeProfileId) return
    const tab = await window.electronAPI.addTab(activeProfileId, paneId)
    if (tab) {
      const updated = await window.electronAPI.getProfiles()
      setProfiles(updated)
    }
  }, [activeProfileId])

  const handleRemoveTab = useCallback(async (paneId: string, tabId: string) => {
    if (!activeProfileId) return
    const result = await window.electronAPI.removeTab(activeProfileId, paneId, tabId)
    if (result.success) {
      const updated = await window.electronAPI.getProfiles()
      setProfiles(updated)
    }
  }, [activeProfileId])

  const handleSetActiveTab = useCallback(async (paneId: string, tabId: string) => {
    if (!activeProfileId) return
    await window.electronAPI.setActiveTab(activeProfileId, paneId, tabId)
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== activeProfileId) return p
        return {
          ...p,
          panes: p.panes.map((pane) =>
            pane.id === paneId ? { ...pane, activeTabId: tabId } : pane
          ),
        }
      })
    )
  }, [activeProfileId])

  const handleMoveTab = useCallback(async (fromPaneId: string, tabId: string, toPaneId: string) => {
    if (!activeProfileId) return
    const result = await window.electronAPI.moveTab(activeProfileId, fromPaneId, tabId, toPaneId)
    if (result.success) {
      const updated = await window.electronAPI.getProfiles()
      setProfiles(updated)
    }
  }, [activeProfileId])

  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleResize = useCallback((path: number[], ratio: number) => {
    if (!activeProfileId) return
    // Optimistic local update — instant, no IPC
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== activeProfileId) return p
        return { ...p, splitTree: updateRatioByPath(p.splitTree, path, ratio) }
      })
    )
    // Debounce IPC to main process (repositions WebContentsViews)
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
    resizeTimerRef.current = setTimeout(() => {
      window.electronAPI.updateSplitRatio(activeProfileId, path, ratio)
    }, 32)
  }, [activeProfileId])

  const handleSwapPanes = useCallback(async (paneIdA: string, paneIdB: string) => {
    if (!activeProfileId) return
    const result = await window.electronAPI.swapPanes(activeProfileId, paneIdA, paneIdB)
    if (result.success) {
      const updated = await window.electronAPI.getProfiles()
      setProfiles(updated)
    }
  }, [activeProfileId])

  // View state handlers
  const handleBellClick = useCallback(() => {
    if (viewState === 'notifications') {
      setViewState('workspace')
    } else {
      setViewState('notifications')
    }
  }, [viewState])

  const handleNotificationClick = useCallback((notification: NotificationItem) => {
    markRead(notification.id)
    // Check if the source pane still exists
    const sourceProfile = profiles.find((p) => p.id === notification.profileId)
    const paneExists = sourceProfile?.panes.some((p) => p.id === notification.paneId)
    if (!paneExists) {
      // Toast: "This tab has been closed" — for now just stay on notification page
      return
    }
    // Switch to source profile and close notification page
    handleSwitchProfile(notification.profileId)
    setViewState('workspace')
  }, [markRead, profiles, handleSwitchProfile])

  // Keyboard shortcut: Cmd/Ctrl+L to focus address bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('.address-bar-input:focus, input[type="text"]')
        input?.focus()
      }
      // Ctrl+Shift+N to split active pane
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        if (activeProfile) {
          handleSplit(activeProfile.activePaneId, 'horizontal')
        }
      }
      // Ctrl+T to add a new tab in the active pane
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault()
        if (activeProfile) {
          handleAddTab(activeProfile.activePaneId)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeProfile, handleSplit, handleAddTab])

  // Hide/show WebContentsViews based on view state
  useEffect(() => {
    if (viewState === 'notifications') {
      window.electronAPI.hideAllViews()
    } else if (activeProfileId) {
      window.electronAPI.showProfileViews(activeProfileId)
    }
  }, [viewState, activeProfileId])

  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
        <Toolbar
          profileName={activeProfile?.name || 'MultiMessenger'}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onRenameProfile={(name) => {
            if (activeProfileId) handleRenameProfile(activeProfileId, name)
          }}
          onRemoveProfile={() => {
            if (activeProfileId) handleRemoveProfile(activeProfileId)
          }}
        />
        <div className="flex flex-1 min-h-0">
          <Sidebar
            profiles={profiles}
            activeProfileId={activeProfileId}
            unreadCount={unreadCount}
            onAddProfile={handleAddProfile}
            onSwitchProfile={handleSwitchProfile}
            onReorder={handleReorder}
            onBellClick={handleBellClick}
          />
          <div className="flex-1 relative min-w-0 bg-muted/30">
            {viewState === 'notifications' ? (
              <NotificationPage
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAllRead={markAllRead}
              />
            ) : activeProfile ? (
              <PaneDndProvider onSwap={handleSwapPanes} onMoveTab={handleMoveTab}>
                <ContentArea
                  profile={activeProfile}
                  tabUrls={tabUrls}
                  tabNavState={tabNavState}
                  tabLoading={tabLoading}
                  onNavigate={handleNavigate}
                  onSplit={handleSplit}
                  onRemovePane={handleRemovePane}
                  onSetActivePane={handleSetActivePane}
                  onGoBack={handleGoBack}
                  onGoForward={handleGoForward}
                  onReload={handleReload}
                  onResize={handleResize}
                  onAddTab={handleAddTab}
                  onRemoveTab={handleRemoveTab}
                  onSetActiveTab={handleSetActiveTab}
                />
              </PaneDndProvider>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg mb-2">No profiles yet</p>
                  <p className="text-sm">Click + to add a profile</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

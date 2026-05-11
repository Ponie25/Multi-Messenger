import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider } from './components/ThemeProvider'
import { Sidebar } from './components/Sidebar'
import { ContentArea } from './components/ContentArea'
import { RightSidebar, RIGHT_SIDEBAR_COLLAPSED_WIDTH, RIGHT_SIDEBAR_EXPANDED_WIDTH } from './components/RightSidebar'
import { QuickTextPanel } from './components/QuickTextPanel'
import type { Profile } from './types'
import './index.css'

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [paneUrls, setPaneUrls] = useState<Record<string, string>>({})
  const [paneNavState, setPaneNavState] = useState<Record<string, { canGoBack: boolean; canGoForward: boolean }>>({})
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)

  useEffect(() => {
    window.electronAPI.resizeSidebar({ rightSidebarWidth: RIGHT_SIDEBAR_COLLAPSED_WIDTH })
  }, [])

  useEffect(() => {
    const api = window.electronAPI

    api.getProfiles().then((loaded) => {
      setProfiles(loaded)
      if (loaded.length > 0) {
        setActiveProfileId(loaded[0].id)
      }
    })

    const unsubUrl = api.onPaneUrlChanged(({ paneId, url }) => {
      setPaneUrls((prev) => ({ ...prev, [paneId]: url }))
    })

    const unsubNav = api.onPaneNavState(({ paneId, canGoBack, canGoForward }) => {
      setPaneNavState((prev) => ({ ...prev, [paneId]: { canGoBack, canGoForward } }))
    })

    const unsubSwitch = api.onProfileSwitch((profileId) => {
      setActiveProfileId(profileId)
    })

    return () => {
      unsubUrl()
      unsubNav()
      unsubSwitch()
    }
  }, [])

  const handleAddProfile = useCallback(async () => {
    const newProfile = await window.electronAPI.addProfile()
    if (newProfile) {
      setProfiles((prev) => [...prev, newProfile])
      setActiveProfileId(newProfile.id)
    }
  }, [])

  const handleSwitchProfile = useCallback(async (profileId: string) => {
    await window.electronAPI.switchProfile(profileId)
    setActiveProfileId(profileId)
  }, [])

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

  const handleNavigate = useCallback(async (paneId: string, url: string) => {
    if (!activeProfileId) return
    await window.electronAPI.navigatePane(activeProfileId, paneId, url)
    setPaneUrls((prev) => ({ ...prev, [paneId]: url }))
  }, [activeProfileId])

  const handleAddPane = useCallback(async () => {
    if (!activeProfileId) return
    const pane = await window.electronAPI.addPane(activeProfileId)
    if (pane) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === activeProfileId
            ? { ...p, panes: [...p.panes, pane], activePaneId: pane.id }
            : p
        )
      )
    }
  }, [activeProfileId])

  const handleRemovePane = useCallback(async (paneId: string) => {
    if (!activeProfileId) return
    const result = await window.electronAPI.removePane(activeProfileId, paneId)
    if (result.success) {
      setProfiles((prev) =>
        prev.map((p) => {
          if (p.id !== activeProfileId) return p
          const panes = p.panes.filter((pn) => pn.id !== paneId)
          const activePaneId = p.activePaneId === paneId ? panes[0]?.id : p.activePaneId
          return { ...p, panes, activePaneId }
        })
      )
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

  const handleGoBack = useCallback((paneId: string) => {
    if (!activeProfileId) return
    window.electronAPI.goBack(activeProfileId, paneId)
  }, [activeProfileId])

  const handleGoForward = useCallback((paneId: string) => {
    if (!activeProfileId) return
    window.electronAPI.goForward(activeProfileId, paneId)
  }, [activeProfileId])

  // Keyboard shortcut: Cmd/Ctrl+L to focus address bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('.address-bar-input:focus, input[type="text"]')
        input?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleToggleRightSidebar = useCallback(() => {
    const next = !rightSidebarOpen
    setRightSidebarOpen(next)
    window.electronAPI.resizeSidebar({
      rightSidebarWidth: next ? RIGHT_SIDEBAR_EXPANDED_WIDTH : RIGHT_SIDEBAR_COLLAPSED_WIDTH,
    })
  }, [rightSidebarOpen])

  // Cmd/Ctrl+B to toggle right sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        handleToggleRightSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleToggleRightSidebar])

  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <Sidebar
          profiles={profiles}
          activeProfileId={activeProfileId}
          onAddProfile={handleAddProfile}
          onSwitchProfile={handleSwitchProfile}
          onRemoveProfile={handleRemoveProfile}
          onRenameProfile={handleRenameProfile}
          onReorder={handleReorder}
        />
        <div className="flex-1 relative">
          {activeProfile ? (
            <ContentArea
              profile={activeProfile}
              paneUrls={paneUrls}
              paneNavState={paneNavState}
              onNavigate={handleNavigate}
              onAddPane={handleAddPane}
              onRemovePane={handleRemovePane}
              onSetActivePane={handleSetActivePane}
              onGoBack={handleGoBack}
              onGoForward={handleGoForward}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg mb-2">No profiles yet</p>
                <p className="text-sm">Click + to add a profile</p>
              </div>
            </div>
          )}
        </div>
        <RightSidebar isOpen={rightSidebarOpen} onToggle={handleToggleRightSidebar}>
          <QuickTextPanel />
        </RightSidebar>
      </div>
    </ThemeProvider>
  )
}

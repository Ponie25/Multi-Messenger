import React, { useState, useEffect, useCallback } from 'react'
import { ThemeProvider } from './components/ThemeProvider'
import { Sidebar } from './components/Sidebar'
import { RightSidebar, RIGHT_SIDEBAR_COLLAPSED_WIDTH, RIGHT_SIDEBAR_EXPANDED_WIDTH } from './components/RightSidebar'
import { QuickTextPanel } from './components/QuickTextPanel'
import type { Account } from './types'
import './index.css'

const LEFT_SIDEBAR_WIDTH = 72

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [badges, setBadges] = useState<Record<string, number>>({})
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)

  // On mount, tell main process about the collapsed right sidebar width
  useEffect(() => {
    window.electronAPI.resizeSidebar({ rightSidebarWidth: RIGHT_SIDEBAR_COLLAPSED_WIDTH })
  }, [])

  useEffect(() => {
    const api = window.electronAPI

    // Pull accounts on mount (avoids race condition with push event)
    api.getAccounts().then((loadedAccounts) => {
      setAccounts(loadedAccounts)
      if (loadedAccounts.length > 0) {
        setActiveAccountId(loadedAccounts[0].id)
      }
    })

    // Badge updates from webviews
    api.onBadgeUpdate(({ accountId, count }) => {
      setBadges((prev) => ({ ...prev, [accountId]: count }))
    })

    // Account info updates (name/avatar detected from DOM)
    api.onAccountInfoUpdated(({ accountId, name, avatarUrl }) => {
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, name, avatarUrl } : a))
      )
    })

    // Account switch triggered from notification click
    api.onAccountSwitch((accountId) => {
      setActiveAccountId(accountId)
    })

    return () => {
      api.removeAllListeners('badge:update')
      api.removeAllListeners('account:infoUpdated')
      api.removeAllListeners('account:switch')
    }
  }, [])

  const handleAddAccount = useCallback(async () => {
    const newAccount = await window.electronAPI.addAccount()
    setAccounts((prev) => [...prev, newAccount])
    setActiveAccountId(newAccount.id)
  }, [])

  const handleSwitchAccount = useCallback(async (accountId: string) => {
    await window.electronAPI.switchAccount(accountId)
    setActiveAccountId(accountId)
  }, [])

  const handleRemoveAccount = useCallback(async (accountId: string) => {
    const result = await window.electronAPI.removeAccount(accountId)
    if (result.success) {
      const remaining = result.remaining ?? []
      setAccounts(remaining)
      setBadges((prev) => {
        const next = { ...prev }
        delete next[accountId]
        return next
      })
      if (activeAccountId === accountId) {
        setActiveAccountId(remaining.length > 0 ? remaining[0].id : null)
      }
    }
  }, [activeAccountId])

  const handleToggleNotifications = useCallback(async (accountId: string, enabled: boolean) => {
    await window.electronAPI.toggleNotifications(accountId, enabled)
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, notificationsEnabled: enabled } : a))
    )
  }, [])

  const handleReorder = useCallback(async (orderedIds: string[]) => {
    await window.electronAPI.reorderAccounts(orderedIds)
    setAccounts((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]))
      return orderedIds.map((id, index) => ({ ...map.get(id)!, order: index }))
    })
  }, [])

  const handleToggleRightSidebar = useCallback(() => {
    const next = !rightSidebarOpen
    // Prevent opening if it would squeeze content below 400px
    if (next && window.innerWidth - LEFT_SIDEBAR_WIDTH - RIGHT_SIDEBAR_EXPANDED_WIDTH < 400) return
    setRightSidebarOpen(next)
    window.electronAPI.resizeSidebar({
      rightSidebarWidth: next ? RIGHT_SIDEBAR_EXPANDED_WIDTH : RIGHT_SIDEBAR_COLLAPSED_WIDTH
    })
  }, [rightSidebarOpen])

  // Auto-collapse right sidebar when window is too narrow
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 800 && rightSidebarOpen) {
        setRightSidebarOpen(false)
        window.electronAPI.resizeSidebar({ rightSidebarWidth: RIGHT_SIDEBAR_COLLAPSED_WIDTH })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [rightSidebarOpen])

  // Keyboard shortcut: Cmd/Ctrl+B to toggle right sidebar
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
      <div className="flex h-screen w-screen overflow-hidden bg-background relative">
        <Sidebar
          accounts={accounts}
          activeAccountId={activeAccountId}
          badges={badges}
          onAddAccount={handleAddAccount}
          onSwitchAccount={handleSwitchAccount}
          onRemoveAccount={handleRemoveAccount}
          onToggleNotifications={handleToggleNotifications}
          onReorder={handleReorder}
        />
        {/* Content area — WebContentsView fills this space via main process */}
        <div className="flex-1 relative">
          {accounts.length === 0 && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg mb-2">No accounts yet</p>
                <p className="text-sm">Click + to add a Facebook account</p>
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

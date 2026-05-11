import React, { useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Sun, Moon, Plus } from 'lucide-react'
import { AccountAvatar } from './AccountAvatar'
import { Button } from './ui/button'
import { useTheme } from './ThemeProvider'
import type { Account } from '../types'

interface SidebarProps {
  accounts: Account[]
  activeAccountId: string | null
  badges: Record<string, number>
  onAddAccount: () => void
  onSwitchAccount: (accountId: string) => void
  onRemoveAccount: (accountId: string) => void
  onToggleNotifications: (accountId: string, enabled: boolean) => void
  onReorder: (orderedIds: string[]) => void
}

interface SortableAccountItemProps {
  account: Account
  isActive: boolean
  badgeCount: number
  onSwitch: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

function SortableAccountItem({
  account,
  isActive,
  badgeCount,
  onSwitch,
  onContextMenu,
}: SortableAccountItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: account.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex justify-center relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 transition-opacity"
        aria-label={`Drag to reorder ${account.name}`}
        title="Drag to reorder"
      >
        <svg viewBox="0 0 6 14" className="w-2 h-4 fill-current text-muted-foreground" aria-hidden="true">
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="2" cy="7" r="1.5" />
          <circle cx="2" cy="12" r="1.5" />
        </svg>
      </div>
      <AccountAvatar
          name={account.name}
          avatarUrl={account.avatarUrl}
          isActive={isActive}
          badgeCount={badgeCount}
          notificationsEnabled={account.notificationsEnabled}
          onClick={onSwitch}
          onContextMenu={onContextMenu}
        />
    </div>
  )
}

export function Sidebar({
  accounts,
  activeAccountId,
  badges,
  onAddAccount,
  onSwitchAccount,
  onRemoveAccount,
  onToggleNotifications,
  onReorder,
}: SidebarProps) {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleContextMenu = useCallback(async (e: React.MouseEvent, accountId: string) => {
    e.preventDefault()
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return
    const result = await window.electronAPI.showAccountContextMenu(accountId, account.notificationsEnabled)
    if (result.action === 'remove') {
      onRemoveAccount(accountId)
    } else if (result.action === 'toggleNotifications') {
      onToggleNotifications(accountId, !account.notificationsEnabled)
    }
  }, [accounts, onRemoveAccount, onToggleNotifications])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = accounts.findIndex((a) => a.id === active.id)
        const newIndex = accounts.findIndex((a) => a.id === over.id)
        const reordered = arrayMove(accounts, oldIndex, newIndex)
        onReorder(reordered.map((a) => a.id))
      }
    },
    [accounts, onReorder]
  )

  const isDark = resolvedTheme === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <nav
        className="flex flex-col items-center py-3 gap-3 bg-card border-r border-border"
        style={{ width: 72, minWidth: 72, maxWidth: 72 }}
        aria-label="Account switcher"
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={accounts.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3 flex-1 w-full items-center overflow-y-auto scrollbar-hide">
              {accounts.map((account) => (
                <SortableAccountItem
                  key={account.id}
                  account={account}
                  isActive={account.id === activeAccountId}
                  badgeCount={badges[account.id] ?? 0}
                  onSwitch={() => onSwitchAccount(account.id)}
                  onContextMenu={(e) => handleContextMenu(e, account.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full text-muted-foreground hover:text-foreground"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Add account button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddAccount}
          className="w-12 h-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
          aria-label="Add account"
          title="Add account"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </nav>
  )
}

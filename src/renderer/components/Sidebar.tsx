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
import { Sun, Moon, Plus, Bell, Settings } from 'lucide-react'
import { ProfileAvatar } from './ProfileAvatar'
import { Button } from './ui/button'
import { useTheme } from './ThemeProvider'
import type { Profile } from '../types'

interface SidebarProps {
  profiles: Profile[]
  activeProfileId: string | null
  unreadCount: number
  settingsActive: boolean
  onAddProfile: () => void
  onSwitchProfile: (profileId: string) => void
  onReorder: (orderedIds: string[]) => void
  onBellClick: () => void
  onSettingsClick: () => void
}

function SortableProfileItem({
  profile,
  isActive,
  onSwitch,
}: {
  profile: Profile
  isActive: boolean
  onSwitch: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: profile.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProfileAvatar
        name={profile.name}
        isActive={isActive}
        onClick={onSwitch}
      />
    </div>
  )
}

export function Sidebar({
  profiles,
  activeProfileId,
  unreadCount,
  settingsActive,
  onAddProfile,
  onSwitchProfile,
  onReorder,
  onBellClick,
  onSettingsClick,
}: SidebarProps) {
  const { resolvedTheme, setTheme } = useTheme()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = profiles.findIndex((p) => p.id === active.id)
        const newIndex = profiles.findIndex((p) => p.id === over.id)
        const reordered = arrayMove(profiles, oldIndex, newIndex)
        onReorder(reordered.map((p) => p.id))
      }
    },
    [profiles, onReorder]
  )

  const isDark = resolvedTheme === 'dark'

  return (
    <nav
      className="flex flex-col items-center py-3 gap-3 bg-background border-r border-border"
      style={{ width: 72, minWidth: 72, maxWidth: 72 }}
      aria-label="Profile switcher"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto scrollbar-hide">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={profiles.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="flex w-full flex-col items-center gap-3">
              {profiles.map((profile) => (
                <SortableProfileItem
                  key={profile.id}
                  profile={profile}
                  isActive={profile.id === activeProfileId}
                  onSwitch={() => onSwitchProfile(profile.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          variant="ghost"
          size="icon"
          onClick={onAddProfile}
          className="w-10 h-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
          aria-label="Add profile"
          title="Add profile"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="mt-auto flex flex-col items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBellClick}
          className="w-10 h-10 rounded-full text-muted-foreground hover:text-foreground relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-10 h-10 rounded-full text-muted-foreground hover:text-foreground"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          className={`w-10 h-10 rounded-full text-muted-foreground hover:text-foreground ${settingsActive ? 'bg-accent text-foreground' : ''}`}
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </nav>
  )
}

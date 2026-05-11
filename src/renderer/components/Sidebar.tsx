import React, { useCallback, useState } from 'react'
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
import { ProfileAvatar } from './ProfileAvatar'
import { Button } from './ui/button'
import { useTheme } from './ThemeProvider'
import type { Profile } from '../types'

interface SidebarProps {
  profiles: Profile[]
  activeProfileId: string | null
  onAddProfile: () => void
  onSwitchProfile: (profileId: string) => void
  onRemoveProfile: (profileId: string) => void
  onRenameProfile: (profileId: string, name: string) => void
  onReorder: (orderedIds: string[]) => void
}

interface SortableProfileItemProps {
  profile: Profile
  isActive: boolean
  isRenaming: boolean
  onSwitch: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onRenameSubmit: (name: string) => void
  onRenameCancel: () => void
}

function SortableProfileItem({
  profile,
  isActive,
  isRenaming,
  onSwitch,
  onContextMenu,
  onRenameSubmit,
  onRenameCancel,
}: SortableProfileItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: profile.id,
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
        aria-label={`Drag to reorder ${profile.name}`}
        title="Drag to reorder"
      >
        <svg viewBox="0 0 6 14" className="w-2 h-4 fill-current text-muted-foreground" aria-hidden="true">
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="2" cy="7" r="1.5" />
          <circle cx="2" cy="12" r="1.5" />
        </svg>
      </div>
      {isRenaming ? (
        <RenameInput
          defaultValue={profile.name}
          onSubmit={onRenameSubmit}
          onCancel={onRenameCancel}
        />
      ) : (
        <ProfileAvatar
          name={profile.name}
          isActive={isActive}
          onClick={onSwitch}
          onContextMenu={onContextMenu}
        />
      )}
    </div>
  )
}

function RenameInput({
  defaultValue,
  onSubmit,
  onCancel,
}: {
  defaultValue: string
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(defaultValue)

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSubmit(value.trim() || defaultValue)
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => onSubmit(value.trim() || defaultValue)}
      className="w-10 h-10 rounded-full text-center text-xs bg-muted border border-input outline-none focus:ring-1 focus:ring-ring"
    />
  )
}

export function Sidebar({
  profiles,
  activeProfileId,
  onAddProfile,
  onSwitchProfile,
  onRemoveProfile,
  onRenameProfile,
  onReorder,
}: SidebarProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [renamingId, setRenamingId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleContextMenu = useCallback(async (e: React.MouseEvent, profileId: string) => {
    e.preventDefault()
    const result = await window.electronAPI.showProfileContextMenu(profileId)
    if (result.action === 'remove') {
      onRemoveProfile(profileId)
    } else if (result.action === 'rename') {
      setRenamingId(profileId)
    }
  }, [onRemoveProfile])

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
      className="flex flex-col items-center py-3 gap-3 bg-card border-r border-border"
      style={{ width: 72, minWidth: 72, maxWidth: 72 }}
      aria-label="Profile switcher"
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={profiles.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3 flex-1 w-full items-center overflow-y-auto scrollbar-hide">
            {profiles.map((profile) => (
              <SortableProfileItem
                key={profile.id}
                profile={profile}
                isActive={profile.id === activeProfileId}
                isRenaming={profile.id === renamingId}
                onSwitch={() => onSwitchProfile(profile.id)}
                onContextMenu={(e) => handleContextMenu(e, profile.id)}
                onRenameSubmit={(name) => {
                  onRenameProfile(profile.id, name)
                  setRenamingId(null)
                }}
                onRenameCancel={() => setRenamingId(null)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
        onClick={onAddProfile}
        className="w-12 h-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
        aria-label="Add profile"
        title="Add profile"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </nav>
  )
}

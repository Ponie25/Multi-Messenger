import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTabDrag } from './PaneDndContext'
import type { Tab } from '../types'

interface TabBarProps {
  paneId: string
  tabs: Tab[]
  activeTabId: string
  tabUrls: Record<string, string>
  tabLoading: Record<string, boolean>
  onSetActiveTab: (tabId: string) => void
  onAddTab: () => void
  onRemoveTab: (tabId: string) => void
}

export function TabBar({
  paneId,
  tabs,
  activeTabId,
  tabUrls,
  tabLoading,
  onSetActiveTab,
  onAddTab,
  onRemoveTab,
}: TabBarProps) {
  return (
    <div className="flex h-8 items-center gap-0.5 border-b border-border bg-muted/30 px-1 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => (
        <TabChip
          key={tab.id}
          tab={tab}
          paneId={paneId}
          isActive={tab.id === activeTabId}
          url={tabUrls[tab.id] || tab.url || ''}
          isLoading={tabLoading[tab.id] || false}
          canClose={tabs.length > 1}
          onClick={() => onSetActiveTab(tab.id)}
          onClose={() => onRemoveTab(tab.id)}
        />
      ))}
      <button
        onClick={onAddTab}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/60 hover:bg-accent hover:text-muted-foreground"
        title="New tab (Ctrl+T)"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function getFaviconUrl(url: string): string | null {
  try {
    const origin = new URL(url).origin
    return `${origin}/favicon.ico`
  } catch {
    return null
  }
}

interface TabChipProps {
  tab: Tab
  paneId: string
  isActive: boolean
  url: string
  isLoading: boolean
  canClose: boolean
  onClick: () => void
  onClose: () => void
}

function TabChip({ tab, paneId, isActive, url, isLoading, canClose, onClick, onClose }: TabChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useTabDrag(tab.id, paneId)
  const hostname = getHostname(url)
  const favicon = getFaviconUrl(url)
  const label = hostname || 'New Tab'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'group flex h-6 max-w-[140px] min-w-[60px] shrink-0 items-center gap-1.5 rounded px-2 text-xs cursor-pointer select-none transition-colors',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        isDragging && 'opacity-50'
      )}
    >
      {favicon && url && (
        <img
          src={favicon}
          alt=""
          className="h-3 w-3 shrink-0 rounded-sm"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      {isLoading && (
        <div className="h-3 w-3 shrink-0 rounded-full border border-muted-foreground/40 border-t-transparent animate-spin" />
      )}
      <span className="truncate flex-1">{label}</span>
      {canClose && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="hidden group-hover:flex h-4 w-4 shrink-0 items-center justify-center rounded-sm hover:bg-muted-foreground/20"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  )
}

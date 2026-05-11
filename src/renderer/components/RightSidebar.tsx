import { cn } from '@/lib/utils'
import { PanelRightOpen, X } from 'lucide-react'

export const RIGHT_SIDEBAR_COLLAPSED_WIDTH = 36
export const RIGHT_SIDEBAR_EXPANDED_WIDTH = 280

interface RightSidebarProps {
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function RightSidebar({ isOpen, onToggle, children }: RightSidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col border-l border-border bg-card transition-all duration-200 overflow-hidden',
        isOpen ? 'w-[280px]' : 'w-[36px]'
      )}
    >
      {isOpen ? (
        <>
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-sm font-medium text-foreground">Quick Text</span>
            <button
              onClick={onToggle}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide p-2">
            {children}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center pt-2">
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            title="Open Quick Text"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  )
}

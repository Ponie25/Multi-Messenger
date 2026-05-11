import React from 'react'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

export const RIGHT_SIDEBAR_COLLAPSED_WIDTH = 36
export const RIGHT_SIDEBAR_EXPANDED_WIDTH = 280

interface RightSidebarProps {
  isOpen: boolean
  onToggle: () => void
  children?: React.ReactNode
}

export function RightSidebar({ isOpen, onToggle, children }: RightSidebarProps) {
  return (
    <aside
      id="right-sidebar-panel"
      className={cn(
        "h-full border-l border-border bg-card flex flex-col transition-[width] duration-200 ease-in-out motion-reduce:transition-none overflow-hidden shrink-0",
        isOpen ? "w-[280px]" : "w-[36px]"
      )}
      aria-label="Utility panel"
    >
      {isOpen ? (
        <>
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-sm font-medium text-foreground">Quick Text</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="Close sidebar"
              aria-expanded={true}
              aria-controls="right-sidebar-panel"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center pt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Open sidebar"
            aria-expanded={false}
            aria-controls="right-sidebar-panel"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      )}
    </aside>
  )
}

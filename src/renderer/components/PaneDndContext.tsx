import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'

interface PaneDndProviderProps {
  children: React.ReactNode
  onSwap: (paneIdA: string, paneIdB: string) => void
}

export function PaneDndProvider({ children, onSwap }: PaneDndProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const over = event.over
    setOverId(over ? (over.id as string) : null)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onSwap(active.id as string, over.id as string)
    }
    setActiveId(null)
    setOverId(null)
  }, [onSwap])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setOverId(null)
  }, [])

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <PaneDndOverlayContext.Provider value={{ activeId, overId }}>
        {children}
      </PaneDndOverlayContext.Provider>
    </DndContext>
  )
}

// Context for child components to know drag state
import { createContext, useContext } from 'react'

interface PaneDndOverlayState {
  activeId: string | null
  overId: string | null
}

const PaneDndOverlayContext = createContext<PaneDndOverlayState>({ activeId: null, overId: null })

export function usePaneDndOverlay() {
  return useContext(PaneDndOverlayContext)
}

// Hook for making a pane draggable (used on the drag handle)
export function usePaneDrag(paneId: string) {
  return useDraggable({ id: paneId })
}

// Hook for making a pane a drop target
export function usePaneDrop(paneId: string) {
  return useDroppable({ id: paneId })
}

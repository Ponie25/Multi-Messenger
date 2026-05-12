import { useState, useCallback, createContext, useContext, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

// Typed drag data
export interface PaneDragData {
  type: 'pane'
  paneId: string
}

export interface TabDragData {
  type: 'tab'
  tabId: string
  fromPaneId: string
}

export type DragData = PaneDragData | TabDragData

interface PaneDndProviderProps {
  children: React.ReactNode
  onSwap: (paneIdA: string, paneIdB: string) => void
  onMoveTab: (fromPaneId: string, tabId: string, toPaneId: string) => void
}

export function PaneDndProvider({ children, onSwap, onMoveTab }: PaneDndProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  })
  const sensors = useSensors(pointerSensor)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setActiveDragData((event.active.data.current as DragData) || null)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const over = event.over
    setOverId(over ? (over.id as string) : null)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over) {
      const dragData = active.data.current as DragData | undefined
      if (dragData?.type === 'tab') {
        // Tab dropped on a pane — move tab to that pane
        const toPaneId = over.id as string
        if (toPaneId !== dragData.fromPaneId) {
          onMoveTab(dragData.fromPaneId, dragData.tabId, toPaneId)
        }
      } else if (dragData?.type === 'pane') {
        // Pane drag — swap panes (compare actual paneIds, not dnd IDs)
        const toPaneId = over.id as string
        if (dragData.paneId !== toPaneId) {
          onSwap(dragData.paneId, toPaneId)
        }
      }
    }
    setActiveId(null)
    setActiveDragData(null)
    setOverId(null)
  }, [onSwap, onMoveTab])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setActiveDragData(null)
    setOverId(null)
  }, [])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <PaneDndOverlayContext.Provider value={{ activeId, activeDragData, overId }}>
        {children}
      </PaneDndOverlayContext.Provider>
    </DndContext>
  )
}

// Context for child components to know drag state
interface PaneDndOverlayState {
  activeId: string | null
  activeDragData: DragData | null
  overId: string | null
}

const PaneDndOverlayContext = createContext<PaneDndOverlayState>({ activeId: null, activeDragData: null, overId: null })

export function usePaneDndOverlay() {
  return useContext(PaneDndOverlayContext)
}

// Hook for making a pane draggable (used on the drag handle)
export function usePaneDrag(paneId: string) {
  return useDraggable({
    id: `pane-${paneId}`,
    data: { type: 'pane', paneId } as PaneDragData,
  })
}

// Hook for making a tab draggable
export function useTabDrag(tabId: string, fromPaneId: string) {
  return useDraggable({
    id: `tab-${tabId}`,
    data: { type: 'tab', tabId, fromPaneId } as TabDragData,
  })
}

// Hook for making a pane a drop target (accepts both pane swaps and tab drops)
export function usePaneDrop(paneId: string) {
  return useDroppable({ id: paneId })
}

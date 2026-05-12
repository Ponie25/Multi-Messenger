import { useRef, useCallback } from 'react'
import type { SplitNode, SplitDirection } from '../types'
import { AddressBar } from './AddressBar'
import { ResizeHandle } from './ResizeHandle'
import { usePaneDrop, usePaneDndOverlay } from './PaneDndContext'
import { MAX_PANES_PER_PROFILE } from '../../shared/constants'
import { countLeaves } from '../../shared/split-tree'

interface SplitContainerProps {
  node: SplitNode
  paneUrls: Record<string, string>
  paneNavState: Record<string, { canGoBack: boolean; canGoForward: boolean }>
  paneLoading: Record<string, boolean>
  activePaneId: string
  totalLeaves: number
  onNavigate: (paneId: string, url: string) => void
  onSplit: (paneId: string, direction: SplitDirection) => void
  onClose: (paneId: string) => void
  onSetActivePane: (paneId: string) => void
  onGoBack: (paneId: string) => void
  onGoForward: (paneId: string) => void
  onReload: (paneId: string) => void
  onResize: (path: number[], ratio: number) => void
  path: number[]
}

export function SplitContainer({
  node,
  paneUrls,
  paneNavState,
  paneLoading,
  activePaneId,
  totalLeaves,
  onNavigate,
  onSplit,
  onClose,
  onSetActivePane,
  onGoBack,
  onGoForward,
  onReload,
  onResize,
  path,
}: SplitContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleResize = useCallback((newRatio: number) => {
    onResize(path, newRatio)
  }, [onResize, path])

  if (node.type === 'leaf') {
    const paneId = node.paneId
    const navState = paneNavState[paneId] || { canGoBack: false, canGoForward: false }
    const currentUrl = paneUrls[paneId] || ''
    const isLoading = paneLoading[paneId] || false

    return (
      <PaneLeaf
        paneId={paneId}
        currentUrl={currentUrl}
        isActive={paneId === activePaneId}
        isLoading={isLoading}
        navState={navState}
        canSplit={totalLeaves < MAX_PANES_PER_PROFILE}
        canClose={totalLeaves > 1}
        onNavigate={onNavigate}
        onSplit={onSplit}
        onClose={onClose}
        onSetActivePane={onSetActivePane}
        onGoBack={onGoBack}
        onGoForward={onGoForward}
        onReload={onReload}
      />
    )
  }

  // Branch node
  const { direction, ratio, children } = node
  const isHorizontal = direction === 'horizontal'

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full min-w-0 min-h-0 ${isHorizontal ? 'flex-row' : 'flex-col'}`}
    >
      <div style={{ flex: `${ratio} 1 0%` }} className="min-w-0 min-h-0 animate-[paneIn_200ms_ease-out]">
        <SplitContainer
          node={children[0]}
          paneUrls={paneUrls}
          paneNavState={paneNavState}
          paneLoading={paneLoading}
          activePaneId={activePaneId}
          totalLeaves={totalLeaves}
          onNavigate={onNavigate}
          onSplit={onSplit}
          onClose={onClose}
          onSetActivePane={onSetActivePane}
          onGoBack={onGoBack}
          onGoForward={onGoForward}
          onReload={onReload}
          onResize={onResize}
          path={[...path, 0]}
        />
      </div>
      <ResizeHandle
        direction={direction}
        onResize={handleResize}
        parentSize={isHorizontal
          ? (containerRef.current?.offsetWidth ?? 800)
          : (containerRef.current?.offsetHeight ?? 600)
        }
        parentOffset={isHorizontal
          ? (containerRef.current?.getBoundingClientRect().left ?? 0)
          : (containerRef.current?.getBoundingClientRect().top ?? 0)
        }
      />
      <div style={{ flex: `${1 - ratio} 1 0%` }} className="min-w-0 min-h-0 animate-[paneIn_200ms_ease-out]">
        <SplitContainer
          node={children[1]}
          paneUrls={paneUrls}
          paneNavState={paneNavState}
          paneLoading={paneLoading}
          activePaneId={activePaneId}
          totalLeaves={totalLeaves}
          onNavigate={onNavigate}
          onSplit={onSplit}
          onClose={onClose}
          onSetActivePane={onSetActivePane}
          onGoBack={onGoBack}
          onGoForward={onGoForward}
          onReload={onReload}
          onResize={onResize}
          path={[...path, 1]}
        />
      </div>
    </div>
  )
}

// Leaf pane with drop target for DnD swap
interface PaneLeafProps {
  paneId: string
  currentUrl: string
  isActive: boolean
  isLoading: boolean
  navState: { canGoBack: boolean; canGoForward: boolean }
  canSplit: boolean
  canClose: boolean
  onNavigate: (paneId: string, url: string) => void
  onSplit: (paneId: string, direction: SplitDirection) => void
  onClose: (paneId: string) => void
  onSetActivePane: (paneId: string) => void
  onGoBack: (paneId: string) => void
  onGoForward: (paneId: string) => void
  onReload: (paneId: string) => void
}

function PaneLeaf({
  paneId,
  currentUrl,
  isActive,
  isLoading,
  navState,
  canSplit,
  canClose,
  onNavigate,
  onSplit,
  onClose,
  onSetActivePane,
  onGoBack,
  onGoForward,
  onReload,
}: PaneLeafProps) {
  const { setNodeRef, isOver } = usePaneDrop(paneId)
  const { activeId } = usePaneDndOverlay()
  const showHighlight = isOver && activeId !== paneId

  return (
    <div ref={setNodeRef} className="flex flex-col h-full w-full min-w-0 min-h-0 relative rounded-lg overflow-hidden border border-border bg-background">
      <AddressBar
        paneId={paneId}
        currentUrl={currentUrl}
        isActive={isActive}
        canGoBack={navState.canGoBack}
        canGoForward={navState.canGoForward}
        canSplit={canSplit}
        canClose={canClose}
        onNavigate={(url) => onNavigate(paneId, url)}
        onGoBack={() => onGoBack(paneId)}
        onGoForward={() => onGoForward(paneId)}
        onReload={() => onReload(paneId)}
        onSplit={(direction) => onSplit(paneId, direction)}
        onClose={() => onClose(paneId)}
        onFocus={() => onSetActivePane(paneId)}
      />
      {isLoading && (
        <div className="h-0.5 w-full bg-muted overflow-hidden">
          <div className="h-full w-1/3 bg-primary animate-[loading_1s_ease-in-out_infinite]" />
        </div>
      )}
      {/* WebContentsView fills this space — managed by main process */}
      <div className="flex-1" />
      {showHighlight && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-primary/30 rounded pointer-events-none z-10" />
      )}
    </div>
  )
}

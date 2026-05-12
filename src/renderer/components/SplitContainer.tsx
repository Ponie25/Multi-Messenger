import { useRef, useCallback } from 'react'
import type { SplitNode, SplitDirection, Pane } from '../types'
import { AddressBar } from './AddressBar'
import { TabBar } from './TabBar'
import { ResizeHandle } from './ResizeHandle'
import { usePaneDrop, usePaneDndOverlay } from './PaneDndContext'
import { MAX_PANES_PER_PROFILE } from '../../shared/constants'
import { countLeaves } from '../../shared/split-tree'

interface SplitContainerProps {
  node: SplitNode
  panes: Pane[]
  tabUrls: Record<string, string>
  tabNavState: Record<string, { canGoBack: boolean; canGoForward: boolean }>
  tabLoading: Record<string, boolean>
  activePaneId: string
  totalLeaves: number
  onNavigate: (paneId: string, tabId: string, url: string) => void
  onSplit: (paneId: string, direction: SplitDirection) => void
  onClose: (paneId: string) => void
  onSetActivePane: (paneId: string) => void
  onGoBack: (paneId: string, tabId: string) => void
  onGoForward: (paneId: string, tabId: string) => void
  onReload: (paneId: string, tabId: string) => void
  onResize: (path: number[], ratio: number) => void
  onAddTab: (paneId: string) => void
  onRemoveTab: (paneId: string, tabId: string) => void
  onSetActiveTab: (paneId: string, tabId: string) => void
  path: number[]
}

export function SplitContainer({
  node,
  panes,
  tabUrls,
  tabNavState,
  tabLoading,
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
  onAddTab,
  onRemoveTab,
  onSetActiveTab,
  path,
}: SplitContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleResize = useCallback((newRatio: number) => {
    onResize(path, newRatio)
  }, [onResize, path])

  if (node.type === 'leaf') {
    const paneId = node.paneId
    const pane = panes.find((p) => p.id === paneId)
    if (!pane) return null

    const activeTabId = pane.activeTabId
    const navState = tabNavState[activeTabId] || { canGoBack: false, canGoForward: false }
    const currentUrl = tabUrls[activeTabId] || pane.tabs.find((t) => t.id === activeTabId)?.url || ''
    const isLoading = tabLoading[activeTabId] || false

    return (
      <PaneLeaf
        paneId={paneId}
        pane={pane}
        currentUrl={currentUrl}
        isActive={paneId === activePaneId}
        isLoading={isLoading}
        navState={navState}
        canSplit={totalLeaves < MAX_PANES_PER_PROFILE}
        canClose={totalLeaves > 1}
        tabUrls={tabUrls}
        tabLoading={tabLoading}
        onNavigate={onNavigate}
        onSplit={onSplit}
        onClose={onClose}
        onSetActivePane={onSetActivePane}
        onGoBack={onGoBack}
        onGoForward={onGoForward}
        onReload={onReload}
        onAddTab={onAddTab}
        onRemoveTab={onRemoveTab}
        onSetActiveTab={onSetActiveTab}
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
          panes={panes}
          tabUrls={tabUrls}
          tabNavState={tabNavState}
          tabLoading={tabLoading}
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
          onAddTab={onAddTab}
          onRemoveTab={onRemoveTab}
          onSetActiveTab={onSetActiveTab}
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
          panes={panes}
          tabUrls={tabUrls}
          tabNavState={tabNavState}
          tabLoading={tabLoading}
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
          onAddTab={onAddTab}
          onRemoveTab={onRemoveTab}
          onSetActiveTab={onSetActiveTab}
          path={[...path, 1]}
        />
      </div>
    </div>
  )
}

// Leaf pane with drop target for DnD swap
interface PaneLeafProps {
  paneId: string
  pane: Pane
  currentUrl: string
  isActive: boolean
  isLoading: boolean
  navState: { canGoBack: boolean; canGoForward: boolean }
  canSplit: boolean
  canClose: boolean
  tabUrls: Record<string, string>
  tabLoading: Record<string, boolean>
  onNavigate: (paneId: string, tabId: string, url: string) => void
  onSplit: (paneId: string, direction: SplitDirection) => void
  onClose: (paneId: string) => void
  onSetActivePane: (paneId: string) => void
  onGoBack: (paneId: string, tabId: string) => void
  onGoForward: (paneId: string, tabId: string) => void
  onReload: (paneId: string, tabId: string) => void
  onAddTab: (paneId: string) => void
  onRemoveTab: (paneId: string, tabId: string) => void
  onSetActiveTab: (paneId: string, tabId: string) => void
}

function PaneLeaf({
  paneId,
  pane,
  currentUrl,
  isActive,
  isLoading,
  navState,
  canSplit,
  canClose,
  tabUrls,
  tabLoading,
  onNavigate,
  onSplit,
  onClose,
  onSetActivePane,
  onGoBack,
  onGoForward,
  onReload,
  onAddTab,
  onRemoveTab,
  onSetActiveTab,
}: PaneLeafProps) {
  const { setNodeRef, isOver } = usePaneDrop(paneId)
  const { activeId, activeDragData } = usePaneDndOverlay()
  const showHighlight = isOver && (
    (activeDragData?.type === 'pane' && activeDragData.paneId !== paneId) ||
    (activeDragData?.type === 'tab' && activeDragData.fromPaneId !== paneId)
  )

  return (
    <div ref={setNodeRef} className="flex flex-col h-full w-full min-w-0 min-h-0 relative rounded-lg overflow-hidden border border-border bg-background">
      <TabBar
        paneId={paneId}
        tabs={pane.tabs}
        activeTabId={pane.activeTabId}
        tabUrls={tabUrls}
        tabLoading={tabLoading}
        onSetActiveTab={(tabId) => onSetActiveTab(paneId, tabId)}
        onAddTab={() => onAddTab(paneId)}
        onRemoveTab={(tabId) => onRemoveTab(paneId, tabId)}
      />
      <AddressBar
        paneId={paneId}
        tabId={pane.activeTabId}
        currentUrl={currentUrl}
        isActive={isActive}
        canGoBack={navState.canGoBack}
        canGoForward={navState.canGoForward}
        canSplit={canSplit}
        canClose={canClose}
        onNavigate={(url) => onNavigate(paneId, pane.activeTabId, url)}
        onGoBack={() => onGoBack(paneId, pane.activeTabId)}
        onGoForward={() => onGoForward(paneId, pane.activeTabId)}
        onReload={() => onReload(paneId, pane.activeTabId)}
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

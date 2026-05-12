import type { Profile, SplitDirection } from '../types'
import { SplitContainer } from './SplitContainer'
import { countLeaves } from '../../shared/split-tree'

interface ContentAreaProps {
  profile: Profile
  tabUrls: Record<string, string>
  tabNavState: Record<string, { canGoBack: boolean; canGoForward: boolean }>
  tabLoading: Record<string, boolean>
  onNavigate: (paneId: string, tabId: string, url: string) => void
  onSplit: (paneId: string, direction: SplitDirection) => void
  onRemovePane: (paneId: string) => void
  onSetActivePane: (paneId: string) => void
  onGoBack: (paneId: string, tabId: string) => void
  onGoForward: (paneId: string, tabId: string) => void
  onReload: (paneId: string, tabId: string) => void
  onResize: (path: number[], ratio: number) => void
  onAddTab: (paneId: string) => void
  onRemoveTab: (paneId: string, tabId: string) => void
  onSetActiveTab: (paneId: string, tabId: string) => void
}

export function ContentArea({
  profile,
  tabUrls,
  tabNavState,
  tabLoading,
  onNavigate,
  onSplit,
  onRemovePane,
  onSetActivePane,
  onGoBack,
  onGoForward,
  onReload,
  onResize,
  onAddTab,
  onRemoveTab,
  onSetActiveTab,
}: ContentAreaProps) {
  const totalLeaves = countLeaves(profile.splitTree)

  return (
    <div className="flex h-full w-full">
      <SplitContainer
        node={profile.splitTree}
        panes={profile.panes}
        tabUrls={tabUrls}
        tabNavState={tabNavState}
        tabLoading={tabLoading}
        activePaneId={profile.activePaneId}
        totalLeaves={totalLeaves}
        onNavigate={onNavigate}
        onSplit={onSplit}
        onClose={onRemovePane}
        onSetActivePane={onSetActivePane}
        onGoBack={onGoBack}
        onGoForward={onGoForward}
        onReload={onReload}
        onResize={onResize}
        onAddTab={onAddTab}
        onRemoveTab={onRemoveTab}
        onSetActiveTab={onSetActiveTab}
        path={[]}
      />
    </div>
  )
}

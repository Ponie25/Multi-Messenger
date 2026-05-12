import type { Profile, SplitDirection } from '../types'
import { SplitContainer } from './SplitContainer'
import { countLeaves } from '../../shared/split-tree'

interface ContentAreaProps {
  profile: Profile
  paneUrls: Record<string, string>
  paneNavState: Record<string, { canGoBack: boolean; canGoForward: boolean }>
  paneLoading: Record<string, boolean>
  onNavigate: (paneId: string, url: string) => void
  onSplit: (paneId: string, direction: SplitDirection) => void
  onRemovePane: (paneId: string) => void
  onSetActivePane: (paneId: string) => void
  onGoBack: (paneId: string) => void
  onGoForward: (paneId: string) => void
  onReload: (paneId: string) => void
  onResize: (path: number[], ratio: number) => void
}

export function ContentArea({
  profile,
  paneUrls,
  paneNavState,
  paneLoading,
  onNavigate,
  onSplit,
  onRemovePane,
  onSetActivePane,
  onGoBack,
  onGoForward,
  onReload,
  onResize,
}: ContentAreaProps) {
  const totalLeaves = countLeaves(profile.splitTree)

  return (
    <div className="flex h-full w-full">
      <SplitContainer
        node={profile.splitTree}
        paneUrls={paneUrls}
        paneNavState={paneNavState}
        paneLoading={paneLoading}
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
        path={[]}
      />
    </div>
  )
}

import { Profile } from '@/types'
import { AddressBar } from './AddressBar'

const MAX_PANES_PER_PROFILE = 3

interface ContentAreaProps {
  profile: Profile
  paneUrls: Record<string, string>
  paneNavState: Record<string, { canGoBack: boolean; canGoForward: boolean }>
  onNavigate: (paneId: string, url: string) => void
  onAddPane: () => void
  onRemovePane: (paneId: string) => void
  onSetActivePane: (paneId: string) => void
  onGoBack: (paneId: string) => void
  onGoForward: (paneId: string) => void
}

export function ContentArea({
  profile,
  paneUrls,
  paneNavState,
  onNavigate,
  onAddPane,
  onRemovePane,
  onSetActivePane,
  onGoBack,
  onGoForward,
}: ContentAreaProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex">
        {profile.panes.map((pane) => {
          const navState = paneNavState[pane.id] || { canGoBack: false, canGoForward: false }
          const currentUrl = paneUrls[pane.id] || pane.url || ''
          return (
            <div key={pane.id} className="flex-1">
              <AddressBar
                paneId={pane.id}
                currentUrl={currentUrl}
                isActive={pane.id === profile.activePaneId}
                canGoBack={navState.canGoBack}
                canGoForward={navState.canGoForward}
                canSplit={profile.panes.length < MAX_PANES_PER_PROFILE}
                canClose={profile.panes.length > 1}
                onNavigate={(url) => onNavigate(pane.id, url)}
                onGoBack={() => onGoBack(pane.id)}
                onGoForward={() => onGoForward(pane.id)}
                onSplit={onAddPane}
                onClose={() => onRemovePane(pane.id)}
                onFocus={() => onSetActivePane(pane.id)}
              />
            </div>
          )
        })}
      </div>
      {/* WebContentsViews fill the remaining space — managed by main process */}
      <div className="flex-1" />
    </div>
  )
}

import { ElectronBlocker } from '@ghostery/adblocker-electron'
import fetch from 'cross-fetch'
import { session } from 'electron'

let blocker: ElectronBlocker | null = null
const enabledSessions = new Set<string>()

export async function initAdBlocker(): Promise<void> {
  try {
    blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
  } catch (err) {
    console.error('[adblocker] Failed to initialize:', err)
  }
}

export function enableBlockingForSession(partitionSession: Electron.Session, partitionKey: string): void {
  if (!blocker || enabledSessions.has(partitionKey)) return
  blocker.enableBlockingInSession(partitionSession)
  enabledSessions.add(partitionKey)
}

export function enableBlockingForAllProfiles(profileIds: string[]): void {
  if (!blocker) return
  for (const id of profileIds) {
    const key = `persist:profile-${id}`
    if (enabledSessions.has(key)) continue
    const s = session.fromPartition(key)
    blocker.enableBlockingInSession(s)
    enabledSessions.add(key)
  }
}

import { ElectronBlocker, adsAndTrackingLists } from '@ghostery/adblocker-electron'
import fetch from 'cross-fetch'
import { session } from 'electron'

let blocker: ElectronBlocker | null = null
const enabledSessions = new Set<string>()

const UBLOCK_EXTRA_LISTS = [
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/main/filters/filters.txt',
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/main/filters/quick-fixes.txt',
  // Vietnamese ad filter list (covers Vietnamese sites like animevietsub, phimmoi, etc.)
  'https://raw.githubusercontent.com/abpvn/abpvn/master/filter/abpvn_ublock.txt',
]

export async function initAdBlocker(): Promise<void> {
  if (blocker) return
  try {
    blocker = await ElectronBlocker.fromLists(fetch, [
      ...adsAndTrackingLists,
      ...UBLOCK_EXTRA_LISTS,
    ])
  } catch (err) {
    console.error('[adblocker] Failed to initialize:', err)
  }
}

export function isAdBlockerReady(): boolean {
  return blocker !== null
}

function enableSessionSafe(s: Electron.Session): void {
  if (!blocker) return
  try {
    blocker.enableBlockingInSession(s)
  } catch {
    // IPC handlers already registered by another session.
    // The preload script was registered before the throw, so cosmetic filtering works.
    // Manually set up webRequest listeners for network blocking.
    s.webRequest.onHeadersReceived({ urls: ['<all_urls>'] }, (details, callback) => {
      blocker!.onHeadersReceived(details, callback)
    })
    s.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
      blocker!.onBeforeRequest(details, callback)
    })
  }
}

export function enableBlockingForSession(partitionSession: Electron.Session, partitionKey: string): void {
  if (!blocker || enabledSessions.has(partitionKey)) return
  enableSessionSafe(partitionSession)
  enabledSessions.add(partitionKey)
}

export function disableBlockingForSession(partitionSession: Electron.Session, partitionKey: string): void {
  if (!blocker || !enabledSessions.has(partitionKey)) return
  try {
    blocker.disableBlockingInSession(partitionSession)
  } catch {
    // Session wasn't fully registered in library — clean up webRequest manually
    partitionSession.webRequest.onHeadersReceived(null)
    partitionSession.webRequest.onBeforeRequest(null)
  }
  enabledSessions.delete(partitionKey)
}

export function enableBlockingForAllProfiles(profileIds: string[]): void {
  if (!blocker) return
  for (const id of profileIds) {
    const key = `persist:profile-${id}`
    if (enabledSessions.has(key)) continue
    const s = session.fromPartition(key)
    enableSessionSafe(s)
    enabledSessions.add(key)
  }
}

export function disableBlockingForAllProfiles(profileIds: string[]): void {
  if (!blocker) return
  for (const id of profileIds) {
    const key = `persist:profile-${id}`
    if (!enabledSessions.has(key)) continue
    const s = session.fromPartition(key)
    try {
      blocker.disableBlockingInSession(s)
    } catch {
      s.webRequest.onHeadersReceived(null)
      s.webRequest.onBeforeRequest(null)
    }
    enabledSessions.delete(key)
  }
}

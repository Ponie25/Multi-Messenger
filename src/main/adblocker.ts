import { ElectronBlocker, adsAndTrackingLists } from '@ghostery/adblocker-electron'
import fetch from 'cross-fetch'
import { session } from 'electron'
import {
  ADBLOCK_FILTERS,
  BUILTIN_ADS_TRACKING_FILTER_ID,
  DEFAULT_ADBLOCK_FILTER_IDS,
  normalizeAdblockFilterIds,
} from '../shared/adblock-filters'

let blocker: ElectronBlocker | null = null
const enabledSessions = new Set<string>()
let activeFilterIds: string[] | null = null
const FILTER_FETCH_TIMEOUT_MS = 12000

interface BuiltAdBlocker {
  blocker: ElectronBlocker | null
  filterIds: string[]
}

function areFilterIdsEqual(a: string[] | null, b: string[]): boolean {
  return Boolean(a) && a!.length === b.length && a!.every((id, index) => id === b[index])
}

function getFilterListUrls(filterIds: string[]): string[] {
  const urls: string[] = []
  if (filterIds.includes(BUILTIN_ADS_TRACKING_FILTER_ID)) {
    urls.push(...adsAndTrackingLists)
  }

  for (const filterId of filterIds) {
    const filter = ADBLOCK_FILTERS.find((item) => item.id === filterId)
    if (filter) urls.push(...filter.urls)
  }

  return Array.from(new Set(urls))
}

async function fetchFilterList(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FILTER_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal } as any)
    if (!response.ok) {
      console.warn(`[adblocker] Skipping ${url}: HTTP ${response.status}`)
      return null
    }
    return await response.text()
  } catch (err: any) {
    console.warn(`[adblocker] Skipping ${url}: ${err?.code || err?.type || err?.message || 'fetch failed'}`)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function buildAdBlocker(filterIds: string[] = DEFAULT_ADBLOCK_FILTER_IDS): Promise<BuiltAdBlocker | null> {
  const normalizedFilterIds = normalizeAdblockFilterIds(filterIds)

  try {
    const filterUrls = getFilterListUrls(normalizedFilterIds)
    if (filterUrls.length === 0) {
      return { blocker: null, filterIds: normalizedFilterIds }
    }

    const lists = (await Promise.all(filterUrls.map(fetchFilterList))).filter((list): list is string =>
      Boolean(list && list.trim())
    )

    if (lists.length === 0) {
      console.error('[adblocker] No filter lists could be loaded')
      return null
    }

    const nextBlocker = ElectronBlocker.parse(lists.join('\n'))
    return { blocker: nextBlocker, filterIds: normalizedFilterIds }
  } catch (err) {
    console.error('[adblocker] Failed to initialize:', err)
    return null
  }
}

export function replaceAdBlocker(next: BuiltAdBlocker): void {
  blocker = next.blocker
  activeFilterIds = next.filterIds
}

export async function initAdBlocker(filterIds: string[] = DEFAULT_ADBLOCK_FILTER_IDS): Promise<void> {
  const normalizedFilterIds = normalizeAdblockFilterIds(filterIds)
  if (blocker && areFilterIdsEqual(activeFilterIds, normalizedFilterIds)) return

  const next = await buildAdBlocker(normalizedFilterIds)
  if (next) replaceAdBlocker(next)
}

export async function rebuildAdBlocker(filterIds: string[]): Promise<void> {
  const next = await buildAdBlocker(filterIds)
  if (next) replaceAdBlocker(next)
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
  if (!enabledSessions.has(partitionKey)) return
  try {
    blocker?.disableBlockingInSession(partitionSession)
  } catch {
    // Session wasn't fully registered in library — clean up webRequest manually
  }
  partitionSession.webRequest.onHeadersReceived(null)
  partitionSession.webRequest.onBeforeRequest(null)
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
  for (const id of profileIds) {
    const key = `persist:profile-${id}`
    if (!enabledSessions.has(key)) continue
    const s = session.fromPartition(key)
    try {
      blocker?.disableBlockingInSession(s)
    } catch {
    }
    s.webRequest.onHeadersReceived(null)
    s.webRequest.onBeforeRequest(null)
    enabledSessions.delete(key)
  }
}

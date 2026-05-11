import { ipcRenderer } from 'electron'

// webview.ts — combined preload for account WebContentsViews
// Handles: badge monitoring (title) + account info detection (DOM)

const accountIdArg = process.argv.find((arg) => arg.startsWith('--account-id='))
const ACCOUNT_ID = accountIdArg ? accountIdArg.replace('--account-id=', '') : ''

// ─── Badge Monitor ────────────────────────────────────────────────────────────

function parseBadgeCount(title: string): number {
  const match = title.match(/^\((\d+)\)/)
  return match ? parseInt(match[1], 10) : 0
}

let lastCount = -1

function checkTitle() {
  try {
    const count = parseBadgeCount(document.title)
    if (count !== lastCount) {
      lastCount = count
      if (ACCOUNT_ID) {
        ipcRenderer.send('ipc:badge-update', { accountId: ACCOUNT_ID, count })
      }
    }
  } catch {
    // Graceful fail — no badge shown, no error surfaced
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null
let titleObserver: MutationObserver | null = null

function startTitleObserver() {
  try {
    const titleEl = document.querySelector('title')
    if (titleEl) {
      titleObserver = new MutationObserver(() => checkTitle())
      titleObserver.observe(titleEl, { childList: true, subtree: true, characterData: true })
    }
    // Polling fallback
    intervalId = setInterval(checkTitle, 3000)
    checkTitle()
  } catch {
    // Graceful fail
  }
}

// ─── Account Info Detection ───────────────────────────────────────────────────

function extractAccountInfo(): { name: string; avatarUrl: string } | null {
  try {
    const nameSelectors = [
      '[data-testid="royal_blue_bar"] span[dir="auto"]',
      'div[role="navigation"] a[aria-label] span',
      'div[aria-label="Facebook"] span[dir="auto"]',
      'a[href="/"][aria-label] span',
    ]
    const avatarSelectors = [
      'div[role="navigation"] a[aria-label] image',
      'div[role="navigation"] a[aria-label] img',
      'a[href="/"][aria-label] img',
    ]

    let name = ''
    for (const sel of nameSelectors) {
      const el = document.querySelector(sel)
      if (el?.textContent?.trim()) {
        name = el.textContent.trim()
        break
      }
    }

    let avatarUrl = ''
    for (const sel of avatarSelectors) {
      const el = document.querySelector(sel) as HTMLImageElement | SVGImageElement | null
      if (el) {
        avatarUrl =
          (el as HTMLImageElement).src ||
          (el as SVGImageElement).getAttribute('href') ||
          (el as SVGImageElement).getAttribute('xlink:href') ||
          ''
        if (avatarUrl) break
      }
    }

    if (!name) return null
    return { name, avatarUrl }
  } catch {
    return null
  }
}

function sendAccountInfo() {
  const info = extractAccountInfo()
  if (info && ACCOUNT_ID) {
    ipcRenderer.send('ipc:account-info', { accountId: ACCOUNT_ID, ...info })
  }
}

// ─── Notification Click Interception ─────────────────────────────────────────

function interceptNotifications() {
  if (!ACCOUNT_ID) return
  try {
    const OriginalNotification = window.Notification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const PatchedNotification = function (title: string, options?: NotificationOptions) {
      const n = new OriginalNotification(title, options)
      n.addEventListener('click', () => {
        ipcRenderer.send('notification:click', ACCOUNT_ID)
      })
      return n
    } as unknown as typeof Notification
    Object.assign(PatchedNotification, OriginalNotification)
    Object.defineProperty(PatchedNotification, 'permission', {
      get: () => OriginalNotification.permission,
    })
    PatchedNotification.requestPermission = OriginalNotification.requestPermission.bind(OriginalNotification)
    window.Notification = PatchedNotification
  } catch {
    // Graceful fail — notifications still work, just without click-to-switch
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

function cleanup() {
  if (intervalId !== null) clearInterval(intervalId)
  if (titleObserver !== null) titleObserver.disconnect()
}

window.addEventListener('beforeunload', cleanup)

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  startTitleObserver()
  interceptNotifications()
  // Delay account info detection to let React hydrate
  setTimeout(sendAccountInfo, 2500)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

export type AdblockFilterCategory = 'core' | 'dns' | 'privacy' | 'annoyances' | 'regional' | 'security'

export interface AdblockFilterOption {
  id: string
  name: string
  description: string
  category: AdblockFilterCategory
  urls: string[]
  source: string
  recommended?: boolean
  aggressive?: boolean
}

export const BUILTIN_ADS_TRACKING_FILTER_ID = 'ghostery-ads-tracking'

export const ADBLOCK_FILTERS: AdblockFilterOption[] = [
  {
    id: BUILTIN_ADS_TRACKING_FILTER_ID,
    name: 'Ads & Tracking',
    description: 'Default browser-level ad and tracker protection.',
    category: 'core',
    urls: [],
    source: 'Ghostery',
    recommended: true,
  },
  {
    id: 'ublock-filters',
    name: 'uBlock filters',
    description: 'Core uBlock Origin network and cosmetic rules.',
    category: 'core',
    urls: ['https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt'],
    source: 'uBlock Origin',
    recommended: true,
  },
  {
    id: 'ublock-quick-fixes',
    name: 'uBlock quick fixes',
    description: 'Fast fixes for sites that frequently change ad behavior.',
    category: 'core',
    urls: ['https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt'],
    source: 'uBlock Origin',
    recommended: true,
  },
  {
    id: 'oisd-big',
    name: 'OISD Small',
    description: 'Compatibility-first DNS blocking; lighter endpoint than OISD Big.',
    category: 'dns',
    urls: ['https://small.oisd.nl/'],
    source: 'OISD',
    recommended: true,
  },
  {
    id: 'hagezi-light',
    name: 'HaGeZi Light',
    description: 'Light DNS blocklist for safer compatibility.',
    category: 'dns',
    urls: ['https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/light.txt'],
    source: 'HaGeZi',
  },
  {
    id: 'hagezi-normal',
    name: 'HaGeZi Normal',
    description: 'Balanced DNS blocking for ads, tracking, metrics, and badware.',
    category: 'dns',
    urls: ['https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/multi.txt'],
    source: 'HaGeZi',
  },
  {
    id: 'hagezi-pro',
    name: 'HaGeZi Pro',
    description: 'Extended DNS blocking recommended by HaGeZi for stronger privacy.',
    category: 'dns',
    urls: ['https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.txt'],
    source: 'HaGeZi',
    recommended: true,
  },
  {
    id: 'hagezi-pro-plus',
    name: 'HaGeZi Pro++',
    description: 'Very broad DNS blocking for privacy-heavy setups.',
    category: 'dns',
    urls: ['https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.plus.txt'],
    source: 'HaGeZi',
    aggressive: true,
  },
  {
    id: 'hagezi-ultimate',
    name: 'HaGeZi Ultimate',
    description: 'Aggressive DNS blocking for experienced users.',
    category: 'dns',
    urls: ['https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/ultimate.txt'],
    source: 'HaGeZi',
    aggressive: true,
  },
  {
    id: 'hagezi-tif',
    name: 'HaGeZi TIF',
    description: 'Threat intelligence domains for malware, phishing, and abuse.',
    category: 'security',
    urls: ['https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/tif.medium.txt'],
    source: 'HaGeZi',
  },
  {
    id: 'hagezi-popup-ads',
    name: 'HaGeZi Pop-Up Ads',
    description: 'Blocks annoying and malicious pop-up ad domains.',
    category: 'annoyances',
    urls: ['https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/popupads.txt'],
    source: 'HaGeZi',
  },
  {
    id: 'easylist',
    name: 'EasyList',
    description: 'General-purpose ad blocking list used by many blockers.',
    category: 'core',
    urls: ['https://easylist.to/easylist/easylist.txt'],
    source: 'EasyList',
  },
  {
    id: 'easyprivacy',
    name: 'EasyPrivacy',
    description: 'Tracker blocking companion list for EasyList.',
    category: 'privacy',
    urls: ['https://easylist.to/easylist/easyprivacy.txt'],
    source: 'EasyList',
  },
  {
    id: 'adguard-base',
    name: 'AdGuard Base',
    description: 'AdGuard ad blocking rules for common web ads.',
    category: 'core',
    urls: ['https://filters.adtidy.org/extension/chromium/filters/2.txt'],
    source: 'AdGuard',
  },
  {
    id: 'adguard-annoyances',
    name: 'AdGuard Annoyances',
    description: 'Cookie banners, popups, and other web interruptions.',
    category: 'annoyances',
    urls: ['https://filters.adtidy.org/extension/chromium/filters/14.txt'],
    source: 'AdGuard',
  },
  {
    id: 'abpvn',
    name: 'ABPVN',
    description: 'Vietnamese ad blocking rules for local websites.',
    category: 'regional',
    urls: ['https://raw.githubusercontent.com/abpvn/abpvn/master/filter/abpvn_ublock.txt'],
    source: 'ABPVN',
    recommended: true,
  },
]

export const DEFAULT_ADBLOCK_FILTER_IDS = [
  BUILTIN_ADS_TRACKING_FILTER_ID,
  'ublock-filters',
  'ublock-quick-fixes',
  'abpvn',
]

const FILTER_IDS = new Set(ADBLOCK_FILTERS.map((filter) => filter.id))

export function normalizeAdblockFilterIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return DEFAULT_ADBLOCK_FILTER_IDS

  const unique = ids.filter((id): id is string => typeof id === 'string' && FILTER_IDS.has(id))
  return Array.from(new Set([BUILTIN_ADS_TRACKING_FILTER_ID, ...unique]))
}

import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import {
  BadgeCheck,
  Bell,
  Check,
  ChevronLeft,
  Filter,
  Info,
  Monitor,
  Palette,
  Search,
  Shield,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import { ADBLOCK_FILTERS, BUILTIN_ADS_TRACKING_FILTER_ID, normalizeAdblockFilterIds } from '../../shared/adblock-filters'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface SettingsPageProps {
  adblockEnabled: boolean
  adblockFilterIds: string[]
  onBack: () => void
  onSave: (enabled: boolean, filterIds: string[]) => Promise<void>
}

const categoryLabels = {
  core: 'Core',
  dns: 'DNS',
  privacy: 'Privacy',
  annoyances: 'Annoyances',
  regional: 'Regional',
  security: 'Security',
}

function SettingNavItem({
  active,
  icon: Icon,
  label,
}: {
  active?: boolean
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      className={`flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm transition-colors ${
        active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
      }`}
      type="button"
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </button>
  )
}

export function SettingsPage({
  adblockEnabled,
  adblockFilterIds,
  onBack,
  onSave,
}: SettingsPageProps) {
  const [query, setQuery] = useState('')
  const [draftFilterIds, setDraftFilterIds] = useState(() => normalizeAdblockFilterIds(adblockFilterIds))
  const [saving, setSaving] = useState(false)
  const selectedFilterIds = useMemo(() => new Set(draftFilterIds), [draftFilterIds])

  useEffect(() => {
    setDraftFilterIds(normalizeAdblockFilterIds(adblockFilterIds))
  }, [adblockFilterIds])

  const savedFilterIds = useMemo(() => normalizeAdblockFilterIds(adblockFilterIds), [adblockFilterIds])
  const hasChanges =
    !adblockEnabled ||
    draftFilterIds.length !== savedFilterIds.length ||
    draftFilterIds.some((id, index) => id !== savedFilterIds[index])

  const filteredFilters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return ADBLOCK_FILTERS
    return ADBLOCK_FILTERS.filter((filter) => {
      const haystack = `${filter.name} ${filter.description} ${filter.source} ${categoryLabels[filter.category]}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [query])

  const toggleFilter = (filterId: string) => {
    if (selectedFilterIds.has(filterId)) {
      setDraftFilterIds(normalizeAdblockFilterIds(draftFilterIds.filter((id) => id !== filterId)))
      return
    }
    setDraftFilterIds(normalizeAdblockFilterIds([...draftFilterIds, filterId]))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(true, draftFilterIds)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      <aside className="hidden w-56 flex-shrink-0 border-r border-border bg-background px-3 py-4 md:block">
        <div className="mb-4 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Settings</p>
            <p className="truncate text-xs text-muted-foreground">MultiMessenger</p>
          </div>
        </div>
        <nav className="space-y-1" aria-label="Settings sections">
          <SettingNavItem active icon={Shield} label="Privacy & Blocking" />
          <SettingNavItem icon={Monitor} label="Workspace" />
          <SettingNavItem icon={Palette} label="Appearance" />
          <SettingNavItem icon={UserRound} label="Profiles" />
          <SettingNavItem icon={Bell} label="Notifications" />
          <SettingNavItem icon={Info} label="About" />
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-5 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1 text-muted-foreground" onClick={onBack}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Minimal browser controls for privacy, profiles, and how each workspace behaves.
              </p>
            </div>
            <div className="hidden rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:block">
              {draftFilterIds.length} filters selected
            </div>
          </div>

          <section className="rounded-lg border border-border bg-card">
            <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-accent text-foreground">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-medium">Ad blocking</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose the filter mix used by the built-in blocker. Changes apply to all profiles.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hasChanges && (
                  <span className="hidden text-xs text-muted-foreground sm:inline">Unsaved changes</span>
                )}
                <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
                  {saving ? 'Applying' : 'Save'}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search filter lists"
                    className="pl-9"
                  />
                </div>

                <div className="overflow-hidden rounded-lg border border-border">
                  {filteredFilters.map((filter, index) => {
                    const checked = selectedFilterIds.has(filter.id)
                    const required = filter.id === BUILTIN_ADS_TRACKING_FILTER_ID
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => {
                          if (!required) toggleFilter(filter.id)
                        }}
                        className={`flex w-full items-start gap-3 border-border p-3 text-left transition-colors ${
                          required ? 'cursor-default' : 'hover:bg-accent/60'
                        } ${
                          index === 0 ? '' : 'border-t'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                            checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'
                          }`}
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{filter.name}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {categoryLabels[filter.category]}
                            </span>
                            {filter.recommended && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                <BadgeCheck className="h-3 w-3" />
                                Recommended
                              </span>
                            )}
                            {required && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                Required
                              </span>
                            )}
                            {filter.aggressive && (
                              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
                                Aggressive
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{filter.description}</span>
                        </span>
                        <span className="hidden flex-shrink-0 text-xs text-muted-foreground sm:block">{filter.source}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Filter className="h-4 w-4" />
                    Filter profile
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium">{adblockEnabled ? 'Enabled' : 'Will enable on save'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Selected</span>
                      <span className="font-medium">{draftFilterIds.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">DNS lists</span>
                      <span className="font-medium">
                        {draftFilterIds.filter((id) => ADBLOCK_FILTERS.find((filter) => filter.id === id)?.category === 'dns').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

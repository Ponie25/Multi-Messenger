import { useState, useRef, KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, Columns2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function normalizeInput(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmed)) return trimmed
  if (!trimmed.includes(' ') && trimmed.includes('.')) return `https://${trimmed}`
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
}

interface AddressBarProps {
  paneId: string
  currentUrl: string
  isActive: boolean
  canGoBack: boolean
  canGoForward: boolean
  canSplit: boolean
  canClose: boolean
  onNavigate: (url: string) => void
  onGoBack: () => void
  onGoForward: () => void
  onSplit: () => void
  onClose: () => void
  onFocus: () => void
}

export function AddressBar({
  currentUrl,
  isActive,
  canGoBack,
  canGoForward,
  canSplit,
  canClose,
  onNavigate,
  onGoBack,
  onGoForward,
  onSplit,
  onClose,
  onFocus,
}: AddressBarProps) {
  const [inputValue, setInputValue] = useState(currentUrl)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync input with currentUrl when not focused
  const displayValue = isFocused ? inputValue : currentUrl

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const url = normalizeInput(inputValue)
      if (url) {
        onNavigate(url)
        inputRef.current?.blur()
      }
    } else if (e.key === 'Escape') {
      setInputValue(currentUrl)
      inputRef.current?.blur()
    }
  }

  function handleFocus() {
    setIsFocused(true)
    setInputValue(currentUrl)
    onFocus()
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function handleBlur() {
    setIsFocused(false)
  }

  return (
    <div
      className={cn(
        'flex h-10 items-center gap-1 border-b px-2',
        isActive ? 'border-border bg-background' : 'border-border bg-muted/30'
      )}
    >
      <button
        onClick={onGoBack}
        disabled={!canGoBack}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <button
        onClick={onGoForward}
        disabled={!canGoForward}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Enter URL or search..."
        className="h-7 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
      {canSplit && (
        <button
          onClick={onSplit}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          title="Split pane"
        >
          <Columns2 className="h-4 w-4" />
        </button>
      )}
      {canClose && (
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"
          title="Close pane"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

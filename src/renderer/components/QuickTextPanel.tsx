import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from './ui/button'
import type { QuickText } from '../types'

export function QuickTextPanel() {
  const [snippets, setSnippets] = useState<QuickText[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newText, setNewText] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editText, setEditText] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI.quickTextGetAll().then(setSnippets)
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleAdd = useCallback(async () => {
    if (!newText.trim()) return
    const label = newLabel.trim() || newText.trim().slice(0, 30)
    const item = await window.electronAPI.quickTextAdd(label, newText.trim())
    setSnippets((prev) => [...prev, item])
    setNewLabel('')
    setNewText('')
    setShowAdd(false)
  }, [newLabel, newText])

  const handleDelete = useCallback(async (id: string) => {
    await window.electronAPI.quickTextRemove(id)
    setSnippets((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const handleStartEdit = useCallback((snippet: QuickText) => {
    setEditingId(snippet.id)
    setEditLabel(snippet.label)
    setEditText(snippet.text)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editText.trim()) return
    const label = editLabel.trim() || editText.trim().slice(0, 30)
    await window.electronAPI.quickTextUpdate(editingId, { label, text: editText.trim() })
    setSnippets((prev) =>
      prev.map((s) => (s.id === editingId ? { ...s, label, text: editText.trim() } : s))
    )
    setEditingId(null)
  }, [editingId, editLabel, editText])

  const handleInject = useCallback(async (text: string) => {
    const result = await window.electronAPI.quickTextInject(text)
    if (!result.success) {
      setToast(result.error || 'Could not find chat input')
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      action()
    }
  }

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      {/* Toast notification */}
      {toast && (
        <div className="bg-destructive/10 text-destructive text-xs px-3 py-2 rounded-md" aria-live="assertive" aria-atomic="true">
          {toast}
        </div>
      )}

      {/* Snippet list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {snippets.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No snippets yet</p>
        )}
        {snippets.map((snippet) =>
          editingId === snippet.id ? (
            <div key={snippet.id} className="rounded-md border border-border p-2 space-y-2 bg-card">
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                onBlur={handleSaveEdit}
                placeholder="Label"
                className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
              />
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                placeholder="Text content"
                rows={2}
                className="w-full text-xs bg-transparent border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring resize-none"
              />
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit} aria-label="Save">
                  <Check className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)} aria-label="Cancel">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={snippet.id}
              className="group rounded-md border border-border p-2 hover:bg-accent cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => handleInject(snippet.text)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleInject(snippet.text) } }}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{snippet.label}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{snippet.text}</p>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); handleStartEdit(snippet) }}
                    aria-label="Edit snippet"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(snippet.id) }}
                    aria-label="Delete snippet"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Add snippet form */}
      {showAdd ? (
        <div className="rounded-md border border-border p-2 space-y-2 bg-card">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleAdd)}
            placeholder="Label (optional)"
            className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
            autoFocus
          />
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleAdd)}
            placeholder="Text to inject..."
            rows={2}
            className="w-full text-xs bg-transparent border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring resize-none"
          />
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAdd} aria-label="Save">
              <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowAdd(false); setNewLabel(''); setNewText('') }} aria-label="Cancel">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add snippet
        </Button>
      )}
    </div>
  )
}

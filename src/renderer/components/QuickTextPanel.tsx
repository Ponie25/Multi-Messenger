import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import type { QuickText } from '@/types'

export function QuickTextPanel() {
  const [snippets, setSnippets] = useState<QuickText[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editText, setEditText] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newText, setNewText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI.quickTextGetAll().then(setSnippets)
  }, [])

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 3000)
      return () => clearTimeout(t)
    }
  }, [error])

  async function handleInject(text: string) {
    const result = await window.electronAPI.quickTextInject(text)
    if (!result.success) {
      setError(result.error || 'Injection failed')
    }
  }

  async function handleAdd() {
    if (!newLabel.trim() || !newText.trim()) return
    const item = await window.electronAPI.quickTextAdd(newLabel.trim(), newText.trim())
    setSnippets((prev) => [...prev, item])
    setNewLabel('')
    setNewText('')
    setShowAdd(false)
  }

  async function handleDelete(id: string) {
    await window.electronAPI.quickTextRemove(id)
    setSnippets((prev) => prev.filter((s) => s.id !== id))
  }

  async function handleSaveEdit(id: string) {
    await window.electronAPI.quickTextUpdate(id, { label: editLabel, text: editText })
    setSnippets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, label: editLabel, text: editText } : s))
    )
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </div>
      )}

      {snippets.map((snippet) =>
        editingId === snippet.id ? (
          <div key={snippet.id} className="flex flex-col gap-1 rounded-md border border-input p-2">
            <input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              placeholder="Label"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(snippet.id)}
            />
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[48px] rounded-md border border-input bg-background px-2 py-1 text-xs outline-none resize-none focus:ring-1 focus:ring-ring"
              placeholder="Text content"
            />
            <div className="flex gap-1">
              <button
                onClick={() => handleSaveEdit(snippet.id)}
                className="flex-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="flex-1 rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            key={snippet.id}
            className="group flex items-center gap-1 rounded-md border border-border px-2 py-1.5 hover:bg-accent/50 cursor-pointer"
            onClick={() => handleInject(snippet.text)}
            title="Click to inject"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{snippet.label}</div>
              <div className="text-[10px] text-muted-foreground truncate">{snippet.text}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingId(snippet.id)
                setEditLabel(snippet.label)
                setEditText(snippet.text)
              }}
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(snippet.id)
              }}
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )
      )}

      {showAdd ? (
        <div className="flex flex-col gap-1 rounded-md border border-input p-2">
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            placeholder="Label"
          />
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="min-h-[48px] rounded-md border border-input bg-background px-2 py-1 text-xs outline-none resize-none focus:ring-1 focus:ring-ring"
            placeholder="Text content"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAdd()}
          />
          <div className="flex gap-1">
            <button
              onClick={handleAdd}
              className="flex-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewLabel(''); setNewText('') }}
              className="flex-1 rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add snippet
        </button>
      )}
    </div>
  )
}

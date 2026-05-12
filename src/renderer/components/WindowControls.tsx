import { useState, useEffect } from 'react'

export function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI.windowIsMaximized().then(setIsMaximized)
  }, [])

  const handleMinimize = () => window.electronAPI.windowMinimize()
  const handleMaximize = () => {
    window.electronAPI.windowMaximize()
    setIsMaximized(!isMaximized)
  }
  const handleClose = () => window.electronAPI.windowClose()

  const btnClass = 'inline-flex items-center justify-center w-11 h-9 hover:bg-muted transition-colors'

  return (
    <div className="flex items-center -mr-3">
      <button className={btnClass} onClick={handleMinimize} aria-label="Minimize">
        <svg width="10" height="1" viewBox="0 0 10 1" className="fill-foreground">
          <rect width="10" height="1" />
        </svg>
      </button>
      <button className={btnClass} onClick={handleMaximize} aria-label={isMaximized ? 'Restore' : 'Maximize'}>
        {isMaximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" className="fill-none stroke-foreground">
            <rect x="2" y="0" width="8" height="8" strokeWidth="1" fill="none" />
            <rect x="0" y="2" width="8" height="8" strokeWidth="1" fill="var(--background)" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" className="fill-none stroke-foreground">
            <rect x="0" y="0" width="10" height="10" strokeWidth="1" />
          </svg>
        )}
      </button>
      <button className={`${btnClass} hover:bg-red-500 hover:text-white`} onClick={handleClose} aria-label="Close">
        <svg width="10" height="10" viewBox="0 0 10 10" className="stroke-current">
          <line x1="0" y1="0" x2="10" y2="10" strokeWidth="1" />
          <line x1="10" y1="0" x2="0" y2="10" strokeWidth="1" />
        </svg>
      </button>
    </div>
  )
}

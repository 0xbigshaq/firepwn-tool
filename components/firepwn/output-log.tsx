"use client"

import { useEffect, useRef } from "react"
import { Terminal, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase } from "@/lib/firebase-context"
import { cn } from "@/lib/utils"

export function OutputLog() {
  const { logs, clearLogs } = useFirebase()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [logs])

  return (
    <div className="flex h-full flex-col overflow-hidden border-t border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Output / Log</span>
          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
            {logs.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearLogs}
          disabled={logs.length === 0}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
      <div
        ref={scrollRef}
        className="log-scroll flex-1 overflow-y-auto"
        role="log"
        aria-live="polite"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No log entries yet. Initialize Firebase and run some operations.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {logs.map((entry) => (
              <article key={entry.id} className="px-4 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{entry.time}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs font-medium",
                      entry.type === "error" && "bg-destructive/20 text-destructive",
                      entry.type === "success" && "bg-success/20 text-success",
                      entry.type === "info" && "bg-secondary text-muted-foreground"
                    )}
                  >
                    {entry.type}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-foreground/90">
                  {entry.content}
                </pre>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

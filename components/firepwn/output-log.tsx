"use client"

import { Button } from "@/components/ui/button"
import { useFirebase } from "@/lib/firebase-context"
import { cn } from "@/lib/utils"
import { PanelBottom, PanelRight, Terminal, Trash2 } from "lucide-react"
import { Highlight, themes } from "prism-react-renderer"
import { useEffect, useRef } from "react"

function parseJsonParts(content: string): { text: string; isJson: boolean }[] {
  const parts: { text: string; isJson: boolean }[] = []
  let remaining = content

  while (remaining.length > 0) {
    const braceIdx = remaining.search(/[{[]/)
    if (braceIdx === -1) {
      parts.push({ text: remaining, isJson: false })
      break
    }

    if (braceIdx > 0) {
      parts.push({ text: remaining.slice(0, braceIdx), isJson: false })
      remaining = remaining.slice(braceIdx)
    }

    // Bracket-match to find the closing brace
    let depth = 0
    let inStr = false
    let esc = false
    let endIdx = -1

    for (let j = 0; j < remaining.length; j++) {
      const c = remaining[j]
      if (esc) { esc = false; continue }
      if (c === "\\" && inStr) { esc = true; continue }
      if (c === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (c === "{" || c === "[") depth++
      if (c === "}" || c === "]") {
        depth--
        if (depth === 0) { endIdx = j; break }
      }
    }

    if (endIdx !== -1) {
      const candidate = remaining.slice(0, endIdx + 1)
      try {
        const parsed = JSON.parse(candidate)
        parts.push({ text: JSON.stringify(parsed, null, 2), isJson: true })
        remaining = remaining.slice(endIdx + 1)
        continue
      } catch {
        // Not valid JSON
      }
    }

    // Not valid JSON — consume the opening brace as text
    const last = parts[parts.length - 1]
    if (last && !last.isJson) {
      last.text += remaining[0]
    } else {
      parts.push({ text: remaining[0], isJson: false })
    }
    remaining = remaining.slice(1)
  }

  return parts
}

function LogContent({ content }: { content: string }) {
  const parts = parseJsonParts(content)

  if (!parts.some((p) => p.isJson)) {
    return (
      <pre className="whitespace-pre-wrap break-all pl-10 font-mono text-xs leading-relaxed text-foreground/90">
        {content}
      </pre>
    )
  }

  return (
    <div className="pl-10">
      {parts.map((part, i) =>
        part.isJson ? (
          <Highlight key={i} theme={themes.vsDark} code={part.text} language="json">
            {({ style, tokens, getLineProps, getTokenProps }) => (
              <pre
                style={style}
                className="my-1 overflow-auto rounded-md border border-border px-3 py-2 text-xs"
              >
                {tokens.map((line, j) => (
                  <div key={j} {...getLineProps({ line })}>
                    {line.map((token, k) => (
                      <span key={k} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        ) : (
          <pre
            key={i}
            className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-foreground/90"
          >
            {part.text}
          </pre>
        )
      )}
    </div>
  )
}

interface OutputLogProps {
  direction: "vertical" | "horizontal"
  onToggleDirection: () => void
}

export function OutputLog({ direction, onToggleDirection }: OutputLogProps) {
  const { logs, clearLogs } = useFirebase()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [logs])

  return (
    <div className={cn("flex h-full flex-col overflow-hidden border-border bg-card", direction === "vertical" ? "border-t" : "border-l")}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Output / Log</span>
          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
            {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleDirection}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            title={direction === "vertical" ? "Move panel to right" : "Move panel to bottom"}
          >
            {direction === "vertical" ? (
              <PanelRight className="h-3.5 w-3.5" />
            ) : (
              <PanelBottom className="h-3.5 w-3.5" />
            )}
          </Button>
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
                <LogContent content={entry.content} />
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

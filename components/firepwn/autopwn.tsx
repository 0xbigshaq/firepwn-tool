"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirebase } from "@/lib/firebase-context"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Crosshair, ShieldAlert, ChevronDown, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { useCallback, useRef, useState } from "react"

const COMMON_COLLECTIONS = [
  // Auth / Users
  "users",
  "accounts",
  "profiles",
  "members",
  "customers",
  "employees",
  "staff",
  "admins",
  "administrators",
  "roles",
  "permissions",
  "user_roles",
  // Auth tokens / sessions
  "tokens",
  "sessions",
  "api_keys",
  "secrets",
  "credentials",
  // Content
  "posts",
  "articles",
  "blogs",
  "comments",
  "pages",
  "content",
  "documents",
  "stories",
  "threads",
  "replies",
  // Messaging
  "messages",
  "chats",
  "conversations",
  "channels",
  "notifications",
  "push_tokens",
  "inboxes",
  // E-commerce
  "products",
  "orders",
  "carts",
  "cart_items",
  "payments",
  "transactions",
  "invoices",
  "subscriptions",
  "plans",
  "prices",
  "coupons",
  "discounts",
  "shipping",
  "refunds",
  "checkout_sessions",
  // Media
  "files",
  "images",
  "media",
  "uploads",
  "attachments",
  "videos",
  // App config
  "settings",
  "config",
  "configurations",
  "metadata",
  "system",
  "feature_flags",
  "flags",
  "app_config",
  // Organization
  "organizations",
  "companies",
  "teams",
  "groups",
  "workspaces",
  "projects",
  "departments",
  "tenants",
  // Tasks / Productivity
  "tasks",
  "todos",
  "items",
  "lists",
  "notes",
  "bookmarks",
  "favorites",
  // Taxonomy
  "categories",
  "tags",
  "labels",
  "topics",
  // Reviews / Feedback
  "reviews",
  "ratings",
  "feedback",
  "reports",
  "surveys",
  // Location
  "addresses",
  "locations",
  "places",
  "regions",
  // Analytics / Logging
  "events",
  "logs",
  "analytics",
  "activity",
  "audit_logs",
  "audit",
  // Email
  "emails",
  "newsletters",
  "mail",
  "email_templates",
  // Misc
  "data",
  "records",
  "entries",
  "collections",
  "inventory",
  "reservations",
  "bookings",
  "appointments",
  "schedules",
  "friends",
  "followers",
  "following",
  "connections",
  "contacts",
  "wallets",
  "balances",
  "transfers",
  "devices",
  "webhooks",
  "integrations",
] as const

type PermissionStatus = "allowed" | "denied" | "unknown"

interface CollectionResult {
  name: string
  exists: boolean
  docCount: number
  readAccess: PermissionStatus
  writeAccess: PermissionStatus
  deleteAccess: PermissionStatus
  sampleDocId: string | null
  error: string | null
}

type ScanPhase = "idle" | "discovering" | "testing-write" | "testing-delete" | "done"

export function Autopwn() {
  const { state, output } = useFirebase()
  const [phase, setPhase] = useState<ScanPhase>("idle")
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState("")
  const [results, setResults] = useState<CollectionResult[]>([])
  const [customCollections, setCustomCollections] = useState("")
  const [scanLimit, setScanLimit] = useState("5")
  const [testWrites, setTestWrites] = useState(false)
  const [expandedResults, setExpandedResults] = useState(false)
  const abortRef = useRef(false)
  const [concurrency, setConcurrency] = useState("10")

  const isRunning = phase !== "idle" && phase !== "done"

  const getCollectionsToScan = useCallback((): string[] => {
    const collections: string[] = [...COMMON_COLLECTIONS]
    if (customCollections.trim()) {
      const custom = customCollections
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
      // Prepend custom ones so they're scanned first
      collections.unshift(...custom)
    }
    // Deduplicate
    return [...new Set(collections)]
  }, [customCollections])

  const runScan = useCallback(async () => {
    const w = window as any
    if (!w.firestoreService) {
      output("Firestore not initialized", "error")
      return
    }

    abortRef.current = false
    setResults([])
    setProgress(0)
    setPhase("discovering")
    setExpandedResults(true)

    const collections = getCollectionsToScan()
    const limit = Math.max(1, Math.min(100, parseInt(scanLimit) || 5))
    const maxConcurrent = Math.max(1, Math.min(50, parseInt(concurrency) || 10))
    const found: CollectionResult[] = []

    output(`[Autopwn] Starting scan of ${collections.length} collection names (limit=${limit}, concurrency=${maxConcurrent})...`, "info")

    // Phase 1: Discover collections with read access
    const discoverCollection = async (name: string): Promise<CollectionResult | null> => {
      if (abortRef.current) return null
      try {
        const snapshot = await w.firestoreService.collection(name).limit(limit).get()
        const docCount = snapshot.docs.length
        const sampleDocId = snapshot.docs.length > 0 ? snapshot.docs[0].id : null

        return {
          name,
          exists: docCount > 0,
          docCount,
          readAccess: "allowed",
          writeAccess: "unknown",
          deleteAccess: "unknown",
          sampleDocId,
          error: null,
        }
      } catch {
        // Firestore returns permission-denied for BOTH non-existent collections
        // and existing ones we can't access — so we can't distinguish them.
        // Skip these to avoid false positives.
        return null
      }
    }

    // Run discovery with concurrency control
    for (let i = 0; i < collections.length; i += maxConcurrent) {
      if (abortRef.current) break
      const batch = collections.slice(i, i + maxConcurrent)
      setStatusText(`Probing collections ${i + 1}-${Math.min(i + maxConcurrent, collections.length)} of ${collections.length}...`)

      const batchResults = await Promise.all(batch.map(discoverCollection))

      for (const result of batchResults) {
        if (result) {
          found.push(result)
          setResults((prev) => [...prev, result])
        }
      }

      setProgress(Math.round(((i + batch.length) / collections.length) * 100))
    }

    if (abortRef.current) {
      setPhase("done")
      setStatusText("Scan aborted")
      output(`[Autopwn] Scan aborted. Found ${found.length} accessible collections.`, "info")
      return
    }

    output(`[Autopwn] Discovery complete. Found ${found.length} readable collection${found.length !== 1 ? "s" : ""} with data.`, found.length > 0 ? "success" : "info")

    // Phase 2: Test write/delete access on discovered collections
    if (testWrites && found.length > 0) {
      setPhase("testing-write")
      setProgress(0)
      const testDocId = `__firepwn_probe_${Date.now()}`

      for (let i = 0; i < found.length; i++) {
        if (abortRef.current) break
        const r = found[i]
        setStatusText(`Testing write access on "${r.name}" (${i + 1}/${found.length})...`)

        // Test write
        try {
          await w.firestoreService.collection(r.name).doc(testDocId).set({ _firepwn_probe: true, _ts: Date.now() })
          r.writeAccess = "allowed"
        } catch (e: any) {
          r.writeAccess = e.code === "permission-denied" ? "denied" : "unknown"
        }

        // Test delete (only if write succeeded — we need to clean up)
        if (r.writeAccess === "allowed") {
          setPhase("testing-delete")
          try {
            await w.firestoreService.collection(r.name).doc(testDocId).delete()
            r.deleteAccess = "allowed"
          } catch (e: any) {
            r.deleteAccess = e.code === "permission-denied" ? "denied" : "unknown"
            // Warn: we wrote a doc but couldn't delete it
            output(`[Autopwn] Warning: wrote probe doc to "${r.name}" but couldn't delete it (doc ID: ${testDocId})`, "error")
          }
        } else {
          // Try delete of a fake doc to test delete rules independently
          try {
            await w.firestoreService.collection(r.name).doc(testDocId).delete()
            r.deleteAccess = "allowed"
          } catch (e: any) {
            r.deleteAccess = e.code === "permission-denied" ? "denied" : "unknown"
          }
        }

        // Update the result in state
        setResults((prev) => prev.map((existing) => (existing.name === r.name ? { ...r } : existing)))
        setProgress(Math.round(((i + 1) / found.length) * 100))
      }

      setPhase("testing-write")
    }

    // Build summary
    const readable = found.filter((r) => r.readAccess === "allowed")
    const writable = found.filter((r) => r.writeAccess === "allowed")
    const deletable = found.filter((r) => r.deleteAccess === "allowed")

    let summary = `\n[Autopwn] Scan complete!\n`
    summary += `─────────────────────────────\n`
    summary += `Readable collections: ${readable.length}\n`
    if (testWrites) {
      summary += `Writable: ${writable.length}\n`
      summary += `Deletable: ${deletable.length}\n`
    }
    summary += `─────────────────────────────\n`

    if (readable.length > 0) {
      summary += `\nReadable collections:\n`
      for (const r of readable) {
        summary += `  ● ${r.name} (${r.docCount} doc${r.docCount !== 1 ? "s" : ""})`
        if (testWrites) {
          summary += ` [write: ${r.writeAccess}, delete: ${r.deleteAccess}]`
        }
        summary += `\n`
      }
    }

    if (writable.length > 0) {
      summary += `\n⚠ WRITABLE collections (security risk):\n`
      for (const r of writable) {
        summary += `  ● ${r.name}\n`
      }
    }

    const hasSeverity = writable.length > 0 || deletable.length > 0
    output(summary, hasSeverity ? "error" : readable.length > 0 ? "success" : "info")

    setPhase("done")
    setStatusText("Scan complete")
  }, [getCollectionsToScan, output, scanLimit, testWrites, concurrency])

  const handleAbort = useCallback(() => {
    abortRef.current = true
    setStatusText("Aborting...")
  }, [])

  if (!state.initialized) return null

  const readableCount = results.filter((r) => r.readAccess === "allowed" && r.docCount > 0).length
  const writableCount = results.filter((r) => r.writeAccess === "allowed").length

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">Autopwn</CardTitle>
          <Badge variant="outline" className="text-xs">
            {COMMON_COLLECTIONS.length} built-in names
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Automatically discover Firestore collections by probing common names and test read/write/delete access.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Configuration */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scan-limit" className="text-xs text-muted-foreground">
              Docs per collection
            </Label>
            <Input
              id="scan-limit"
              type="number"
              min="1"
              max="100"
              value={scanLimit}
              onChange={(e) => setScanLimit(e.target.value)}
              disabled={isRunning}
              className="border-border bg-secondary text-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Concurrency</Label>
            <Select value={concurrency} onValueChange={setConcurrency} disabled={isRunning}>
              <SelectTrigger className="border-border bg-secondary text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 (gentle)</SelectItem>
                <SelectItem value="10">10 (default)</SelectItem>
                <SelectItem value="25">25 (fast)</SelectItem>
                <SelectItem value="50">50 (aggressive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Write/Delete test</Label>
            <Select value={testWrites ? "yes" : "no"} onValueChange={(v) => setTestWrites(v === "yes")} disabled={isRunning}>
              <SelectTrigger className="border-border bg-secondary text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Enabled</SelectItem>
                <SelectItem value="no">Discovery only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="custom-collections" className="text-xs text-muted-foreground">
            Custom collection names (comma or newline separated)
          </Label>
          <Input
            id="custom-collections"
            type="text"
            placeholder="my_collection, another_one, app/specific/subcollection"
            value={customCollections}
            onChange={(e) => setCustomCollections(e.target.value)}
            disabled={isRunning}
            className="border-border bg-secondary font-mono text-sm text-foreground"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <Button onClick={runScan} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              <Crosshair className="h-3.5 w-3.5" />
              {phase === "done" ? "Re-scan" : "Start Scan"}
            </Button>
          ) : (
            <Button onClick={handleAbort} variant="destructive" className="gap-1.5">
              Abort
            </Button>
          )}
          {isRunning && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {statusText && <span className="text-xs text-muted-foreground">{statusText}</span>}
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {phase === "discovering" && "Discovering collections..."}
                {phase === "testing-write" && "Testing write/delete access..."}
                {phase === "testing-delete" && "Testing delete access..."}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Collapsible open={expandedResults} onOpenChange={setExpandedResults}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-border bg-secondary px-3 py-2 text-sm transition-colors hover:bg-secondary/80"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">
                    {results.length} collection{results.length !== 1 ? "s" : ""} found
                  </span>
                  <div className="flex gap-2">
                    {readableCount > 0 && (
                      <Badge variant="default" className="bg-green-600 text-xs">
                        {readableCount} readable
                      </Badge>
                    )}
                    {writableCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {writableCount} writable
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedResults ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <ScrollArea className="h-[300px] rounded-md border border-border">
                <div className="divide-y divide-border">
                  {results.map((r) => (
                    <div key={r.name} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2">
                        {r.readAccess === "allowed" && r.docCount > 0 ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" />
                        )}
                        <span className="font-mono text-sm text-foreground">{r.name}</span>
                        {r.docCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({r.docCount} doc{r.docCount !== 1 ? "s" : ""})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <PermissionBadge label="R" status={r.readAccess} />
                        <PermissionBadge label="W" status={r.writeAccess} />
                        <PermissionBadge label="D" status={r.deleteAccess} />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}

        {phase === "done" && results.length === 0 && (
          <div className="rounded-md border border-border bg-secondary px-4 py-3 text-center text-sm text-muted-foreground">
            No accessible collections found. The security rules may be properly configured.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PermissionBadge({ label, status }: { label: string; status: PermissionStatus }) {
  const colors: Record<PermissionStatus, string> = {
    allowed: "bg-green-600/20 text-green-500 border-green-600/30",
    denied: "bg-red-600/20 text-red-500 border-red-600/30",
    unknown: "bg-zinc-600/20 text-zinc-500 border-zinc-600/30",
  }

  return <span className={`inline-flex h-5 w-7 items-center justify-center rounded border text-[10px] font-bold ${colors[status]}`}>{label}</span>
}

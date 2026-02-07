"use client"

import React from "react"

import { useState } from "react"
import { Database, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useFirebase } from "@/lib/firebase-context"

export function FirestoreExplorer() {
  const { state, firestoreOp } = useFirebase()
  const [collectionName, setCollectionName] = useState("")
  const [op, setOp] = useState("get")
  const [docId, setDocId] = useState("")
  const [limit, setLimit] = useState("100")
  const [sortField, setSortField] = useState("")
  const [sortDirection, setSortDirection] = useState("asc")
  const [filterField, setFilterField] = useState("")
  const [filterOp, setFilterOp] = useState("")
  const [filterValue, setFilterValue] = useState("")
  const [jsonInput, setJsonInput] = useState('{\n  someField: "fire",\n  anotherOne: "pwn"\n}')
  const [mergeEnabled, setMergeEnabled] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  if (!state.initialized) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    firestoreOp({
      collectionName,
      op,
      docId,
      jsonInput,
      limit: parseInt(limit) || 100,
      sortField,
      sortDirection,
      filterField,
      filterOp,
      filterValue,
      mergeEnabled,
    })
  }

  const showJsonInput = op === "set" || op === "update"

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">Firestore DB Explorer</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="collection" className="text-xs text-muted-foreground">
              Collection name / Path
            </Label>
            <Input
              id="collection"
              type="text"
              required
              placeholder="users, posts/abc123/comments"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              className="border-border bg-secondary font-mono text-sm text-foreground"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Action</Label>
              <Select value={op} onValueChange={setOp}>
                <SelectTrigger className="border-border bg-secondary text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-foreground">
                  <SelectItem value="get">Get</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc-id" className="text-xs text-muted-foreground">
                Document ID (optional)
              </Label>
              <Input
                id="doc-id"
                type="text"
                placeholder="document-id"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                className="border-border bg-secondary font-mono text-sm text-foreground"
              />
            </div>
          </div>

          {op === "get" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="limit" className="text-xs text-muted-foreground">
                Limit (max documents)
              </Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="10000"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-32 border-border bg-secondary text-foreground"
              />
            </div>
          )}

          {op === "get" && (
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Filter className="h-3.5 w-3.5" />
                  {showFilters ? "Hide" : "Show"} Sort & Filter options
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sort-field" className="text-xs text-muted-foreground">
                      Sort by Field
                    </Label>
                    <Input
                      id="sort-field"
                      type="text"
                      placeholder="timestamp, name, createdAt..."
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value)}
                      className="border-border bg-secondary text-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Sort Direction</Label>
                    <Select value={sortDirection} onValueChange={setSortDirection}>
                      <SelectTrigger className="border-border bg-secondary text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-card text-foreground">
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="filter-field" className="text-xs text-muted-foreground">
                      Filter Field
                    </Label>
                    <Input
                      id="filter-field"
                      type="text"
                      placeholder="status, createdAt..."
                      value={filterField}
                      onChange={(e) => setFilterField(e.target.value)}
                      className="border-border bg-secondary text-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Filter Operator</Label>
                    <Select value={filterOp} onValueChange={setFilterOp}>
                      <SelectTrigger className="border-border bg-secondary text-foreground">
                        <SelectValue placeholder="No Filter" />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-card text-foreground">
                        <SelectItem value="none">No Filter</SelectItem>
                        <SelectItem value="==">{"Equal (==)"}</SelectItem>
                        <SelectItem value="<">{"Less Than (<)"}</SelectItem>
                        <SelectItem value="<=">{"Less or Equal (<=)"}</SelectItem>
                        <SelectItem value=">">{"Greater Than (>)"}</SelectItem>
                        <SelectItem value=">=">{"Greater or Equal (>=)"}</SelectItem>
                        <SelectItem value="array-contains">Array Contains</SelectItem>
                        <SelectItem value="array-contains-any">Array Contains Any</SelectItem>
                        <SelectItem value="in">In Array</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="filter-value" className="text-xs text-muted-foreground">
                      Filter Value
                    </Label>
                    <Input
                      id="filter-value"
                      type="text"
                      placeholder="active, 2023-01-01"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="border-border bg-secondary text-foreground"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {showJsonInput && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="json-input" className="text-xs text-muted-foreground">
                JSON Data
              </Label>
              <textarea
                id="json-input"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={5}
                className="rounded-md border border-border bg-secondary px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {op === "set" && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={mergeEnabled}
                    onChange={(e) => setMergeEnabled(e.target.checked)}
                    className="rounded border-border"
                  />
                  Merge with existing document (instead of overwriting)
                </label>
              )}
            </div>
          )}

          <div>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Execute
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

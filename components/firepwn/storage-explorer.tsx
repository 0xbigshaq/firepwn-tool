"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirebase } from "@/lib/firebase-context"
import { HardDrive } from "lucide-react"
import { useRef, useState } from "react"

export function StorageExplorer() {
  const { state, storageOp } = useFirebase()
  const [path, setPath] = useState("")
  const [op, setOp] = useState("list")
  const [limit, setLimit] = useState("100")
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!state.initialized) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    storageOp({
      path,
      op,
      limit: parseInt(limit) || 100,
      file,
    })
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">Firebase Storage</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="storage-path" className="text-xs text-muted-foreground">
              File Path
            </Label>
            <Input
              id="storage-path"
              type="text"
              placeholder="path/to/file.txt"
              value={path}
              onChange={(e) => setPath(e.target.value)}
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
                  <SelectItem value="list">List Files</SelectItem>
                  <SelectItem value="upload">Upload File</SelectItem>
                  <SelectItem value="download">Download File</SelectItem>
                  <SelectItem value="delete">Delete File</SelectItem>
                  <SelectItem value="get_metadata">Get Metadata</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="storage-limit" className="text-xs text-muted-foreground">
                List Limit
              </Label>
              <Input
                id="storage-limit"
                type="number"
                min="1"
                max="1000"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="border-border bg-secondary text-foreground"
              />
            </div>
          </div>

          {op === "upload" && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Select File</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  className="border-border text-foreground"
                >
                  Choose File
                </Button>
                <span className="truncate text-xs text-muted-foreground">
                  {file ? file.name : "No file selected"}
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
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

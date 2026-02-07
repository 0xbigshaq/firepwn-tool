"use client"

import React from "react"

import { useState } from "react"
import { Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirebase } from "@/lib/firebase-context"

export function CloudFunctions() {
  const { state, invokeCloudFunction } = useFirebase()
  const [cmd, setCmd] = useState("")

  if (!state.initialized) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    invokeCloudFunction(cmd)
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">Cloud Functions</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cloud-cmd" className="text-xs text-muted-foreground">
              Invoke a Cloud Function
            </Label>
            <Input
              id="cloud-cmd"
              type="text"
              required
              placeholder={'makeAdmin({ email: "shaq@pwn.com", isAdmin: true })'}
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              className="border-border bg-secondary font-mono text-sm text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              {'Format: functionName({ param1: "value", param2: true })'}
            </p>
          </div>
          <div>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Invoke
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFirebase } from "@/lib/firebase-context"
import { Cloud } from "lucide-react"
import { useMemo, useState } from "react"

export function CloudFunctions() {
  const { state, invokeCloudFunction } = useFirebase()
  const [cmd, setCmd] = useState("")

  const evalPreview = useMemo(() => {
    if (!cmd) return ""
    const funcName = cmd.split("(")[0]
    const funcParams = cmd.split(funcName)[1]
    if (!funcName || !funcParams) return ""
    return `cloudCallback${funcParams}.then(response => {\n  output("Invoke: ${cmd.replace(/"/g, '\\"')}\\nResponse: " + JSON.stringify(response), "success");\n}).catch(e => {\n  let msg = "Cannot invoke ${funcName.replace(/"/g, '\\"')}. ";\n  if(e.message === 'internal') msg += "Reason: Unknown. ";\n  else if(e.message === 'not-found') msg += "Reason: Cloud Function not found. ";\n  else msg += e.message;\n  output("Error: " + msg, "error");\n})`
  }, [cmd])

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
          {evalPreview && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Code to eval</Label>
              <textarea
                readOnly
                value={evalPreview}
                rows={10}
                className="rounded-md border border-border bg-secondary px-3 py-2 font-mono text-xs text-foreground"
              />
            </div>
          )}
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

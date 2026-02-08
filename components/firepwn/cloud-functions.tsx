"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFirebase } from "@/lib/firebase-context"
import { Cloud } from "lucide-react"
import { Highlight, themes } from "prism-react-renderer"
import { useMemo, useState } from "react"

type Mode = "callable" | "http"
type HttpMethod = "GET" | "POST"

export function CloudFunctions() {
  const { state, invokeCloudFunction, invokeHttpFunction } = useFirebase()
  const [cmd, setCmd] = useState("")
  const [mode, setMode] = useState<Mode>("callable")
  const [httpMethod, setHttpMethod] = useState<HttpMethod>("GET")
  const [funcName, setFuncName] = useState("")
  const [httpArgs, setHttpArgs] = useState("")

  const callPreview = useMemo(() => {
    if (mode === "callable") {
      if (!cmd) return ""
      const name = cmd.split("(")[0]
      const params = cmd.split(name)[1]
      if (!name || !params) return ""
      const argsExpr = params.slice(1, -1).trim()
      let prettyArgs: string
      try {
        prettyArgs = argsExpr ? JSON.stringify(JSON.parse(argsExpr), null, 2) : ""
      } catch {
        prettyArgs = argsExpr
      }
      return `const callable = httpsCallable("${name}")\ncallable(${prettyArgs})`
    } else {
      if (!funcName) return ""
      const projectId = state.config?.projectId ?? "<projectId>"
      let url = `https://us-central1-${projectId}.cloudfunctions.net/${funcName}`
      if (httpMethod === "GET" && httpArgs.trim()) {
        try {
          const parsed = JSON.parse(httpArgs)
          const params = new URLSearchParams(parsed)
          url += `?${params.toString()}`
        } catch {
          url += `?${httpArgs}`
        }
        return `fetch("${url}")`
      } else if (httpMethod === "POST" && httpArgs.trim()) {
        let prettyBody: string
        try {
          prettyBody = JSON.stringify(JSON.parse(httpArgs), null, 2)
        } catch {
          prettyBody = httpArgs
        }
        return `fetch("${url}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: ${prettyBody}\n})`
      }
      return `fetch("${url}")`
    }
  }, [cmd, mode, funcName, httpArgs, httpMethod, state.config])

  if (!state.initialized) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "callable") {
      invokeCloudFunction(cmd)
    } else {
      let args: Record<string, string> = {}
      if (httpArgs.trim()) {
        try {
          args = JSON.parse(httpArgs)
        } catch {
          // for GET, allow raw query string like "text=hello"
          if (httpMethod === "GET") {
            const params = new URLSearchParams(httpArgs)
            params.forEach((v, k) => { args[k] = v })
          } else {
            return
          }
        }
      }
      invokeHttpFunction(funcName, args, httpMethod)
    }
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
        <div className="mb-4 flex gap-1">
          <button
            type="button"
            onClick={() => setMode("callable")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              mode === "callable"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Callable (on_call)
          </button>
          <button
            type="button"
            onClick={() => setMode("http")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              mode === "http"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            HTTP (on_request)
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "callable" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cloud-cmd" className="text-xs text-muted-foreground">
                Invoke a Cloud Function
              </Label>
              <Input
                id="cloud-cmd"
                type="text"
                required
                placeholder={'makeAdmin({ "email": "shaq@pwn.com", "isAdmin": true })'}
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                className="border-border bg-secondary font-mono text-sm text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                {'Format: functionName({ "param1": "value", "param2": true })'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Method</Label>
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value as HttpMethod)}
                    className="rounded-md border border-border bg-secondary px-2 py-1.5 text-sm text-foreground"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="http-func" className="text-xs text-muted-foreground">
                    Function name
                  </Label>
                  <Input
                    id="http-func"
                    type="text"
                    required
                    placeholder="addmessage"
                    value={funcName}
                    onChange={(e) => setFuncName(e.target.value)}
                    className="border-border bg-secondary font-mono text-sm text-foreground"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="http-args" className="text-xs text-muted-foreground">
                  {httpMethod === "GET" ? "Query params (JSON)" : "Request body (JSON)"}
                </Label>
                <Input
                  id="http-args"
                  type="text"
                  placeholder={'{ "text": "hello" }'}
                  value={httpArgs}
                  onChange={(e) => setHttpArgs(e.target.value)}
                  className="border-border bg-secondary font-mono text-sm text-foreground"
                />
              </div>
            </div>
          )}
          {callPreview && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Call preview</Label>
              <Highlight theme={themes.vsDark} code={callPreview} language="javascript">
                {({ style, tokens, getLineProps, getTokenProps }) => (
                  <pre
                    style={style}
                    className="overflow-auto rounded-md border border-border px-3 py-2 text-xs"
                  >
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            </div>
          )}
          <div>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              {mode === "callable" ? "Invoke" : `Send ${httpMethod}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useFirebase } from "@/lib/firebase-context"
import { Braces, Check, Flame, TextCursorInput } from "lucide-react"
import { useState } from "react"

export function InitForm() {
  const { state, initFirebase } = useFirebase()
  const [view, setView] = useState<"fields" | "json">("fields")
  const [config, setConfig] = useState({
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
  })
  const [jsonInput, setJsonInput] = useState("")
  const [jsonError, setJsonError] = useState("")

  const handleFieldsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    initFirebase(config)
  }

  const handleJsonSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setJsonError("")
    try {
      // Allow JS-style object literals (unquoted keys) by wrapping in parentheses
      const parsed = new Function(`return (${jsonInput})`)() as Record<string, string>
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setJsonError("Input must be a JSON object")
        return
      }
      if (!parsed.apiKey) {
        setJsonError("Missing required field: apiKey")
        return
      }
      initFirebase(parsed)
    } catch {
      setJsonError("Invalid JSON. Paste a firebaseConfig object.")
    }
  }

  const fields = [
    { key: "apiKey", label: "API Key", required: true, placeholder: "AIzaSy..." },
    { key: "authDomain", label: "Auth Domain", required: true, placeholder: "your-project.firebaseapp.com" },
    { key: "databaseURL", label: "Database URL", required: true, placeholder: "https://your-project.firebaseio.com" },
    { key: "projectId", label: "Project ID", required: true, placeholder: "your-project-id" },
    { key: "storageBucket", label: "Storage Bucket (optional)", required: false, placeholder: "your-bucket.appspot.com" },
  ] as const

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">Initialize</CardTitle>
        </div>
        <CardDescription>
          Enter your{" "}
          <a
            href="https://firebase.google.com/docs/web/setup#config-object"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            firebaseConfig
          </a>{" "}
          object below
        </CardDescription>
        {!state.initialized && (
          <div className="flex items-center gap-1 mt-2">
            <Button
              variant={view === "fields" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("fields")}
              className="h-7 gap-1.5 px-3 text-xs"
            >
              <TextCursorInput className="h-3.5 w-3.5" />
              Fields
            </Button>
            <Button
              variant={view === "json" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("json")}
              className="h-7 gap-1.5 px-3 text-xs"
            >
              <Braces className="h-3.5 w-3.5" />
              JSON
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {view === "fields" ? (
          <form onSubmit={handleFieldsSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <Label htmlFor={field.key} className="text-sm text-muted-foreground">
                    {field.label}
                  </Label>
                  <Input
                    id={field.key}
                    type="text"
                    required={field.required}
                    disabled={state.initialized}
                    placeholder={field.placeholder}
                    value={config[field.key]}
                    onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="border-border bg-secondary text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              ))}
            </div>
            <div>
              <Button
                type="submit"
                disabled={state.initialized}
                className={
                  state.initialized
                    ? "bg-success text-success-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }
              >
                {state.initialized ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4" /> Initialized
                  </>
                ) : (
                  "Start"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJsonSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="json-config" className="text-sm text-muted-foreground">
                Paste firebaseConfig JSON
              </Label>
              <Textarea
                id="json-config"
                rows={8}
                disabled={state.initialized}
                placeholder={'{\n  apiKey: "AIzaSy...",\n  authDomain: "your-project.firebaseapp.com",\n  projectId: "your-project-id",\n  storageBucket: "your-bucket.appspot.com"\n}'}
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value)
                  setJsonError("")
                }}
                className="border-border bg-secondary font-mono text-sm text-foreground placeholder:text-muted-foreground"
              />
              {jsonError && (
                <p className="text-xs text-destructive">{jsonError}</p>
              )}
            </div>
            <div>
              <Button
                type="submit"
                disabled={state.initialized}
                className={
                  state.initialized
                    ? "bg-success text-success-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }
              >
                {state.initialized ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4" /> Initialized
                  </>
                ) : (
                  "Start"
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

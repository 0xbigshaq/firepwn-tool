"use client"

import React from "react"

import { useState } from "react"
import { Flame, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirebase } from "@/lib/firebase-context"

export function InitForm() {
  const { state, initFirebase } = useFirebase()
  const [config, setConfig] = useState({
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    initFirebase(config)
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
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      </CardContent>
    </Card>
  )
}

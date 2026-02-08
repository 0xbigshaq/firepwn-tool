"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirebase } from "@/lib/firebase-context"
import { Copy, KeyRound, LogOut, ShieldCheck } from "lucide-react"
import { useState } from "react"

function MfaDialog() {
  const { verifyMfaCode, cancelMfa } = useFirebase()
  const [code, setCode] = useState("")

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-medium text-foreground">Multi-Factor Authentication</h4>
      </div>
      <p className="text-xs text-muted-foreground">Enter your 6-digit verification code:</p>
      <Input
        type="text"
        maxLength={6}
        pattern="[0-9]{6}"
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="border-border bg-secondary font-mono text-foreground"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => verifyMfaCode(code)}
          className="bg-success text-success-foreground hover:bg-success/90"
        >
          Verify
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={cancelMfa}
        >
          Cancel
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Check your SMS for the verification code.</p>
      <div id="mfa-recaptcha" />
    </div>
  )
}

export function AuthPanel() {
  const { state, signIn, signUp, signOut, googleOAuth, showMfaDialog } = useFirebase()
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [oauthToken, setOauthToken] = useState("")

  const handleCopyUid = () => {
    if (!state.authUser?.uid) return
    navigator.clipboard.writeText(state.authUser.uid).catch(() => { })
  }

  if (!state.initialized) return null

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">Auth Service</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {state.authUser ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border bg-secondary p-3">
              <p className="text-sm text-foreground">
                Logged in as{" "}
                <span className="font-medium text-primary">{state.authUser.email || "(no email)"}</span>
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">UID:</span>
                <code className="max-w-[180px] truncate font-mono text-xs text-muted-foreground">
                  {state.authUser.uid}
                </code>
                <button
                  type="button"
                  onClick={handleCopyUid}
                  aria-label="Copy user UID"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            <Button
              onClick={signOut}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        ) : showMfaDialog ? (
          <MfaDialog />
        ) : (
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-3 w-full bg-secondary">
              <TabsTrigger value="login" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Register
              </TabsTrigger>
              <TabsTrigger value="oauth" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                OAuth
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  signIn(loginEmail, loginPassword)
                }}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-email" className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    id="login-email"
                    type="text"
                    placeholder="test@test.com"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="border-border bg-secondary text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-pw" className="text-xs text-muted-foreground">Password</Label>
                  <Input
                    id="login-pw"
                    type="password"
                    placeholder="******"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="border-border bg-secondary text-foreground"
                  />
                </div>
                <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Login
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  signUp(signupEmail, signupPassword)
                }}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="signup-email" className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    id="signup-email"
                    type="text"
                    placeholder="test@test.com"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="border-border bg-secondary text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="signup-pw" className="text-xs text-muted-foreground">Password</Label>
                  <Input
                    id="signup-pw"
                    type="password"
                    placeholder="******"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="border-border bg-secondary text-foreground"
                  />
                </div>
                <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Sign up
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="oauth">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  googleOAuth(oauthToken)
                  setOauthToken("")
                }}
                className="flex flex-col gap-3"
              >
                <p className="text-xs text-muted-foreground">
                  Paste an OAuth ID token captured from your app&apos;s Google sign-in flow.
                </p>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="oauth-token" className="text-xs text-muted-foreground">
                    oauthIdToken
                  </Label>
                  <Input
                    id="oauth-token"
                    type="text"
                    placeholder="eyJhbGciOi..."
                    required
                    value={oauthToken}
                    onChange={(e) => setOauthToken(e.target.value)}
                    className="border-border bg-secondary font-mono text-xs text-foreground"
                  />
                </div>
                <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Authenticate
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

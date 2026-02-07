"use client"

import { FirebaseProvider } from "@/lib/firebase-context"
import { Header } from "@/components/firepwn/header"
import { InitForm } from "@/components/firepwn/init-form"
import { AuthPanel } from "@/components/firepwn/auth-panel"
import { FirestoreExplorer } from "@/components/firepwn/firestore-explorer"
import { StorageExplorer } from "@/components/firepwn/storage-explorer"
import { CloudFunctions } from "@/components/firepwn/cloud-functions"
import { OutputLog } from "@/components/firepwn/output-log"

export default function Home() {
  return (
    <FirebaseProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          <p className="mb-6 text-sm italic text-muted-foreground">
            {"Test your Firebase app's authentication & authorization."}
          </p>

          <div className="flex flex-col gap-6">
            <InitForm />

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-6">
                <FirestoreExplorer />
                <StorageExplorer />
                <CloudFunctions />
              </div>
              <div>
                <div className="sticky top-6">
                  <AuthPanel />
                </div>
              </div>
            </div>

            <OutputLog />
          </div>
        </main>

        <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          <a
            href="https://github.com/0xbigshaq/firepwn-tool"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            firepwn
          </a>
          {" - Firebase Security Rules Testing Tool"}
        </footer>
      </div>
    </FirebaseProvider>
  )
}

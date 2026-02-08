"use client"

import { AuthPanel } from "@/components/firepwn/auth-panel"
import { CloudFunctions } from "@/components/firepwn/cloud-functions"
import { FirestoreExplorer } from "@/components/firepwn/firestore-explorer"
import { Header } from "@/components/firepwn/header"
import { InitForm } from "@/components/firepwn/init-form"
import { OutputLog } from "@/components/firepwn/output-log"
import { StorageExplorer } from "@/components/firepwn/storage-explorer"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FirebaseProvider } from "@/lib/firebase-context"
import { Database, Cloud, HardDrive } from "lucide-react"
import { useState } from "react"

export default function Home() {
  const [panelDirection, setPanelDirection] = useState<"vertical" | "horizontal">("vertical")

  return (
    <FirebaseProvider>
      <div className="flex h-screen flex-col bg-background">
        <Header />
        <ResizablePanelGroup direction={panelDirection} className="flex-1">
          <ResizablePanel defaultSize={70} minSize={30}>
            <main className="h-full overflow-y-auto px-4 py-6">
              <div className="mx-auto w-full max-w-7xl">
                <p className="mb-6 text-sm italic text-muted-foreground">
                  {"Test your Firebase app's authentication & authorization."}
                </p>

                <div className="flex flex-col gap-6">
                  <InitForm />

                  <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <Tabs defaultValue="firestore">
                      <TabsList>
                        <TabsTrigger value="firestore" className="gap-1.5">
                          <Database className="h-3.5 w-3.5" />
                          Firestore
                        </TabsTrigger>
                        <TabsTrigger value="storage" className="gap-1.5">
                          <HardDrive className="h-3.5 w-3.5" />
                          Storage
                        </TabsTrigger>
                        <TabsTrigger value="functions" className="gap-1.5">
                          <Cloud className="h-3.5 w-3.5" />
                          Cloud Functions
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="firestore">
                        <FirestoreExplorer />
                      </TabsContent>
                      <TabsContent value="storage">
                        <StorageExplorer />
                      </TabsContent>
                      <TabsContent value="functions">
                        <CloudFunctions />
                      </TabsContent>
                    </Tabs>
                    <div>
                      <div className="sticky top-6">
                        <AuthPanel />
                      </div>
                    </div>
                  </div>
                </div>

                <footer className="border-t border-border mt-6 py-4 text-center text-xs text-muted-foreground">
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
            </main>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={30} minSize={10} maxSize={70}>
            <OutputLog
              direction={panelDirection}
              onToggleDirection={() =>
                setPanelDirection((d) => (d === "vertical" ? "horizontal" : "vertical"))
              }
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </FirebaseProvider>
  )
}

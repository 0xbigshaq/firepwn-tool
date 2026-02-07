import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import Script from "next/script"
import React from "react"

import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" })

export const metadata: Metadata = {
  title: "firepwn - Firebase Security Rules Tester",
  description: "Test your Firebase app authentication & authorization using the Client SDK",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23eab308'/%3E%3Ctext x='16' y='22' fontFamily='monospace' fontSize='16' fontWeight='700' textAnchor='middle' fill='%230a0a0a'%3EFP%3C/text%3E%3C/svg%3E",
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Script src="https://www.gstatic.com/firebasejs/7.15.5/firebase-app.js" strategy="beforeInteractive" />
        <Script src="https://www.gstatic.com/firebasejs/7.15.5/firebase-auth.js" strategy="beforeInteractive" />
        <Script src="https://www.gstatic.com/firebasejs/7.15.5/firebase-firestore.js" strategy="beforeInteractive" />
        <Script src="https://www.gstatic.com/firebasejs/7.15.5/firebase-functions.js" strategy="beforeInteractive" />
        <Script src="https://www.gstatic.com/firebasejs/7.15.5/firebase-storage.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  )
}

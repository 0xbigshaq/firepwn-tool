"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from "react"


export interface LogEntry {
  id: string
  time: string
  content: string
  type: "info" | "error" | "success"
}

interface FirebaseState {
  initialized: boolean
  config: Record<string, string> | null
  authUser: { email: string | null; uid: string } | null
  mfaResolver: unknown | null
  mfaVerificationId: string | null
}

interface FirebaseContextType {
  state: FirebaseState
  logs: LogEntry[]
  initFirebase: (config: Record<string, string>) => void
  output: (content: string, type?: "info" | "error" | "success") => void
  clearLogs: () => void
  signIn: (email: string, password: string) => void
  signUp: (email: string, password: string) => void
  signOut: () => void
  googleOAuth: (idToken: string) => void
  showMfaDialog: boolean
  setShowMfaDialog: (show: boolean) => void
  verifyMfaCode: (code: string) => void
  cancelMfa: () => void
  firestoreOp: (params: FirestoreParams) => void
  invokeCloudFunction: (cmd: string) => void
  storageOp: (params: StorageParams) => void
}

interface FirestoreParams {
  collectionName: string
  op: string
  docId: string
  jsonInput: string
  limit: number
  sortField: string
  sortDirection: string
  filterField: string
  filterOp: string
  filterValue: string
  mergeEnabled: boolean
}

interface StorageParams {
  path: string
  op: string
  limit: number
  file?: File | null
}

const FirebaseContext = createContext<FirebaseContextType | null>(null)

export function useFirebase() {
  const ctx = useContext(FirebaseContext)
  if (!ctx) throw new Error("useFirebase must be used within FirebaseProvider")
  return ctx
}

function formatJsonOutput(jsonData: unknown): string {
  return JSON.stringify(jsonData, null, 2)
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FirebaseState>({
    initialized: false,
    config: null,
    authUser: null,
    mfaResolver: null,
    mfaVerificationId: null,
  })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showMfaDialog, setShowMfaDialog] = useState(false)
  const nextAuthLogMessageRef = useRef<string | null>(null)

  const output = useCallback((content: string, type: "info" | "error" | "success" = "info") => {
    const time = new Date().toLocaleTimeString()
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      time,
      content,
      type,
    }
    setLogs((prev) => [...prev, entry])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const initFirebase = useCallback(
    (config: Record<string, string>) => {
      const w = window as any
      const firebase = w.firebase

      if (!firebase) {
        output("Firebase SDK not loaded. Please check your connection.", "error")
        return
      }

      const firebaseConfig: Record<string, string> = {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        databaseURL: config.databaseURL,
        projectId: config.projectId,
      }

      if (config.storageBucket?.trim()) {
        firebaseConfig.storageBucket = config.storageBucket
      }

      try {
        w.app = firebase.initializeApp(firebaseConfig)
      } catch (e: any) {
        output(`Error: ${e.message}`, "error")
        try { w.app?.delete() } catch { /* noop */ }
        return
      }

      w.firestoreService = firebase.firestore()
      w.authService = firebase.auth()
      w.functionsService = firebase.functions()

      if (firebaseConfig.storageBucket) {
        w.storageService = firebase.storage()
        output(`Storage service initialized with bucket: ${firebaseConfig.storageBucket}`, "success")
      } else {
        output("Storage service not initialized (no storageBucket provided)", "info")
      }

      // Auth state listener
      w.authService.onAuthStateChanged((user: any) => {
        if (user) {
          setState((prev) => ({
            ...prev,
            authUser: { email: user.email, uid: user.uid },
          }))
          const email = user.email || "unknown"
          const logMessage = nextAuthLogMessageRef.current || `Logged in (${email})`
          output(logMessage, "success")
          nextAuthLogMessageRef.current = null
        } else {
          setState((prev) => ({ ...prev, authUser: null }))
        }
      })

      setState((prev) => ({ ...prev, initialized: true, config: firebaseConfig }))
      output("Firebase initialized", "success")
    },
    [output]
  )

  const signIn = useCallback(
    (email: string, password: string) => {
      const w = window as any
      if (!w.authService) return
      w.authService
        .signInWithEmailAndPassword(email, password)
        .catch((e: any) => {
          if (e.code === "auth/multi-factor-auth-required") {
            w.mfaResolver = e.resolver
            setState((prev) => ({ ...prev, mfaResolver: e.resolver }))
            setShowMfaDialog(true)
            output("MFA Required: Please enter your verification code.", "info")
          } else {
            output(`Error: Firebase auth failed - ${e.message}`, "error")
          }
        })
    },
    [output]
  )

  const signUp = useCallback(
    (email: string, password: string) => {
      const w = window as any
      if (!w.authService) return
      w.authService
        .createUserWithEmailAndPassword(email, password)
        .then((creds: any) => {
          output(`Account created (${creds.user.email})`, "success")
        })
        .catch((e: any) => {
          output(`Error: ${e.message}`, "error")
        })
    },
    [output]
  )

  const signOutFn = useCallback(() => {
    const w = window as any
    if (!w.authService) return
    w.authService
      .signOut()
      .then(() => output("Logged out", "info"))
      .catch((e: any) => output(`Failed to sign out: ${e.message}`, "error"))
  }, [output])

  const googleOAuth = useCallback(
    (idToken: string) => {
      const w = window as any
      const firebase = w.firebase
      if (!w.authService || !firebase) return
      try {
        const credential = firebase.auth.GoogleAuthProvider.credential(idToken)
        nextAuthLogMessageRef.current = "Logged in via Google OAuth"
        w.authService.signInWithCredential(credential).catch((e: any) => {
          output(`Error: Google OAuth sign-in failed - ${e.message}`, "error")
          nextAuthLogMessageRef.current = null
        })
      } catch (e: any) {
        output(`Error: ${e.message}`, "error")
      }
    },
    [output]
  )

  const verifyMfaCode = useCallback(
    (code: string) => {
      const w = window as any
      const firebase = w.firebase
      if (!w.mfaResolver) {
        output("MFA session expired. Please try logging in again.", "error")
        setShowMfaDialog(false)
        return
      }

      const enrolledFactors = w.mfaResolver.hints
      if (!enrolledFactors?.length) {
        output("No MFA factors found.", "error")
        return
      }

      const selectedHint = enrolledFactors[0]
      output(`MFA Verification: Attempting to verify ${selectedHint.factorId} code...`, "info")

      if (
        selectedHint.factorId === firebase.auth.PhoneAuthProvider.PROVIDER_ID ||
        selectedHint.factorId === "phone"
      ) {
        if (w.mfaVerificationId) {
          const credential = firebase.auth.PhoneAuthProvider.credential(w.mfaVerificationId, code)
          const assertion = firebase.auth.PhoneMultiFactorGenerator.assertion(credential)
          w.mfaResolver
            .resolveSignIn(assertion)
            .then((result: any) => {
              output(`MFA Success: Logged in as ${result.user.email}`, "success")
              setShowMfaDialog(false)
              w.mfaResolver = null
            })
            .catch((error: any) => {
              let errorMessage = "MFA verification failed"
              if (error.code === "auth/invalid-verification-code") {
                errorMessage = "Invalid verification code."
              } else if (error.code === "auth/code-expired") {
                errorMessage = "Verification code has expired."
              } else {
                errorMessage = `MFA verification failed: ${error.message}`
              }
              output(`MFA Error: ${errorMessage}`, "error")
            })
        } else {
          // Need to send SMS first
          if (!w.recaptchaVerifier) {
            w.recaptchaVerifier = new firebase.auth.RecaptchaVerifier("mfa-recaptcha", {
              size: "invisible",
            })
          }

          const phoneInfoOptions = {
            multiFactorHint: selectedHint,
            session: w.mfaResolver.session,
          }

          const phoneAuthProvider = new firebase.auth.PhoneAuthProvider()
          phoneAuthProvider
            .verifyPhoneNumber(phoneInfoOptions, w.recaptchaVerifier)
            .then((verificationId: string) => {
              w.mfaVerificationId = verificationId
              output(
                `MFA SMS: Verification code sent to ${selectedHint.phoneNumber || "your phone"}. Please enter the 6-digit code.`,
                "info"
              )
            })
            .catch((smsError: any) => {
              output(`MFA Error: Failed to send SMS - ${smsError.message}`, "error")
              if (w.recaptchaVerifier) {
                w.recaptchaVerifier.clear()
                w.recaptchaVerifier = null
              }
            })
        }
      } else {
        output(`Unsupported MFA factor type: ${selectedHint.factorId}`, "error")
      }
    },
    [output]
  )

  const cancelMfa = useCallback(() => {
    const w = window as any
    w.mfaResolver = null
    setShowMfaDialog(false)
    output("MFA Cancelled: Login cancelled by user.", "info")
  }, [output])

  const firestoreOp = useCallback(
    (params: FirestoreParams) => {
      const w = window as any
      if (!w.firestoreService) {
        output("Firestore not initialized", "error")
        return
      }

      const {
        collectionName,
        op,
        docId,
        jsonInput,
        limit,
        sortField,
        sortDirection,
        filterField,
        filterOp: fOp,
        filterValue,
        mergeEnabled,
      } = params

      // Validations
      if (sortField && ["set", "update", "delete"].includes(op)) {
        output("Sorting is only available for GET operations", "error")
        return
      }
      if (sortField && docId) {
        output("Sorting cannot be used when querying a specific document ID", "error")
        return
      }
      if (sortField && !/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(sortField)) {
        output("Invalid sort field name", "error")
        return
      }
      if ((filterField || fOp || filterValue) && ["set", "update", "delete"].includes(op)) {
        output("Filtering is only available for GET operations", "error")
        return
      }
      if (filterField && docId) {
        output("Filtering cannot be used when querying a specific document ID", "error")
        return
      }
      if (filterField && !/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(filterField)) {
        output("Invalid filter field name", "error")
        return
      }
      if (filterField && (!fOp || !filterValue)) {
        output("When using filters, you must specify field, operator, and value", "error")
        return
      }
      if (fOp && (!filterField || !filterValue)) {
        output("When using filters, you must specify field, operator, and value", "error")
        return
      }

      if (["set", "update"].includes(op)) {
        let parsedJson: any
        try {
          // eslint-disable-next-line no-eval
          eval(`parsedJson = [${jsonInput}]; parsedJson = parsedJson[0];`)
        } catch {
          output("Please enter a valid JSON object", "error")
          return
        }

        if (op === "set") {
          try {
            if (docId) {
              const setOptions = mergeEnabled ? { merge: true } : {}
              const operationType = mergeEnabled ? "merged" : "overwritten/created"
              w.firestoreService
                .collection(collectionName)
                .doc(docId)
                .set(parsedJson, setOptions)
                .then(() => {
                  output(
                    `Document ${operationType} (ID: ${docId}) ${mergeEnabled ? "(with merge: true)" : ""}\nResult: ${formatJsonOutput(parsedJson)}`,
                    "success"
                  )
                })
                .catch((e: any) => output(`Error: ${e.message}`, "error"))
            } else {
              w.firestoreService
                .collection(collectionName)
                .add(parsedJson)
                .then((docref: any) => {
                  output(`Document added (ID: ${docref.id})`, "success")
                })
                .catch((e: any) => output(`Error: ${e.message}`, "error"))
            }
          } catch (e: any) {
            output(`Error: ${e.message}`, "error")
          }
        } else if (op === "update") {
          if (!docId) {
            output("Document ID field is mandatory when trying to update a record", "error")
            return
          }
          w.firestoreService
            .collection(collectionName)
            .doc(docId)
            .update(parsedJson)
            .then(() => {
              output(`Updated fields (Doc ID: ${docId})\n${formatJsonOutput(parsedJson)}`, "success")
            })
            .catch((e: any) => output(`Error: ${e.message}`, "error"))
        }
      } else if (op === "get") {
        try {
          if (docId) {
            w.firestoreService
              .collection(collectionName)
              .doc(docId)
              .get()
              .then((snapshot: any) => {
                const data = snapshot.data()
                if (!data) {
                  output(`Document ${docId} not found`, "error")
                  return
                }
                output(
                  `Getting ${docId} from ${collectionName}\nResponse:\n${formatJsonOutput(data)}`,
                  "success"
                )
              })
              .catch((e: any) => output(`Error: ${e.message}`, "error"))
          } else {
            let query: any = w.firestoreService.collection(collectionName)

            if (filterField && fOp && filterValue) {
              let parsedFilterValue: any
              try {
                if (
                  filterValue.startsWith("[") ||
                  filterValue.startsWith("{") ||
                  filterValue === "true" ||
                  filterValue === "false" ||
                  !isNaN(Number(filterValue))
                ) {
                  parsedFilterValue = JSON.parse(filterValue)
                } else {
                  parsedFilterValue = filterValue
                }
              } catch {
                parsedFilterValue = filterValue
              }
              query = query.where(filterField, fOp, parsedFilterValue)
            }

            if (sortField) {
              query = query.orderBy(sortField, sortDirection)
            }

            if (limit) {
              query = query.limit(limit)
            }

            query
              .get()
              .then((snapshots: any) => {
                const safeCollection = collectionName
                const filterInfo = filterField ? ` (filtered by ${filterField} ${fOp} ${filterValue})` : ""
                const sortInfo = sortField ? ` (sorted by ${sortField} ${sortDirection})` : ""
                const limitInfo = limit ? ` (limit: ${limit})` : " (no limit)"
                let result = `Getting documents from ${safeCollection}${limitInfo}${filterInfo}${sortInfo}\nResponse (${snapshots.docs.length} documents):\n`
                if (!snapshots.docs.length) {
                  output(`${result}Empty response`, "info")
                  return
                }
                snapshots.docs.forEach((doc: any) => {
                  const data = doc.data()
                  result += `Document ID: ${doc.id}\n${formatJsonOutput(data)}\n`
                })
                output(result, "success")
              })
              .catch((e: any) => {
                let errorMessage = e.message
                if (e.code === "failed-precondition" && sortField) {
                  errorMessage = `Cannot sort by '${sortField}': This field may not be indexed.`
                } else if (e.code === "failed-precondition" && filterField) {
                  errorMessage = `Cannot filter by '${filterField}': This field may not be indexed.`
                }
                output(`Error: ${errorMessage}`, "error")
              })
          }
        } catch (e: any) {
          output(`Error: ${e.message}`, "error")
        }
      } else if (op === "delete") {
        if (!docId) {
          output("Document ID field is mandatory when trying to delete a record", "error")
          return
        }
        w.firestoreService
          .collection(collectionName)
          .doc(docId)
          .delete()
          .then(() => output(`Deleted (Doc ID: ${docId})`, "success"))
          .catch((e: any) => output(`Error: ${e.message}`, "error"))
      }
    },
    [output]
  )

  const invokeCloudFunction = useCallback(
    (cmd: string) => {
      const w = window as any
      if (!w.functionsService) {
        output("Functions service not initialized", "error")
        return
      }

      const funcName = cmd.split("(")[0]
      const funcParams = cmd.split(funcName)[1]

      const validateFunc = /^[a-zA-Z][a-zA-Z0-9]+([ ]|[a-zA-Z])\(/gm
      if (!validateFunc.exec(cmd)) {
        output("Please enter a valid invoke syntax", "error")
        return
      }

      if (funcParams[funcParams.length - 1] !== ")") {
        output("Please enter a valid invoke syntax. The input must end with ')'", "error")
        return
      }

      const cloudCallback = w.functionsService.httpsCallable(funcName)
      try {
        // eslint-disable-next-line no-eval
        eval(`cloudCallback${funcParams}.then(response => {
          output("Invoke: ${cmd.replace(/"/g, '\\"')}\\nResponse: " + JSON.stringify(response), "success");
        }).catch(e => {
          let msg = "Cannot invoke ${funcName.replace(/"/g, '\\"')}. ";
          if(e.message === 'internal') msg += "Reason: Unknown. ";
          else if(e.message === 'not-found') msg += "Reason: Cloud Function not found. ";
          else msg += e.message;
          output("Error: " + msg, "error");
        })`)
      } catch (e: any) {
        output(`Invalid invoke syntax: ${e.message}`, "error")
      }
    },
    [output]
  )

  const storageOp = useCallback(
    (params: StorageParams) => {
      const w = window as any
      if (!w.storageService) {
        output("Storage service not initialized. Please provide a storageBucket in configuration.", "error")
        return
      }

      const { path, op: sOp, limit: sLimit, file } = params

      switch (sOp) {
        case "list": {
          try {
            const listRef = path ? w.storageService.ref(path) : w.storageService.ref()
            listRef
              .listAll()
              .then((result: any) => {
                const itemsCount = Math.min(result.items.length, sLimit)
                const foldersCount = Math.min(result.prefixes.length, sLimit)
                let txt = `Listing storage contents\nPath: ${path || "(root)"}\n`
                txt += `Files (${itemsCount}/${result.items.length}):\n`
                for (let i = 0; i < itemsCount; i++) {
                  txt += `  ${result.items[i].fullPath}\n`
                }
                txt += `Folders (${foldersCount}/${result.prefixes.length}):\n`
                for (let i = 0; i < foldersCount; i++) {
                  txt += `  ${result.prefixes[i].fullPath}\n`
                }
                output(txt, "success")
              })
              .catch((error: any) => output(`Error listing storage: ${error.message}`, "error"))
          } catch (error: any) {
            output(`Error: ${error.message}`, "error")
          }
          break
        }
        case "upload": {
          if (!file) {
            output("Please select a file to upload", "error")
            return
          }
          if (!path) {
            output("Please specify a storage path for the upload", "error")
            return
          }
          try {
            const uploadRef = w.storageService.ref(path)
            const uploadTask = uploadRef.put(file)
            output(`Uploading file: ${file.name} to ${path}...`, "info")
            uploadTask.on(
              "state_changed",
              (snapshot: any) => {
                if (snapshot.totalBytes > 0) {
                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                  output(`Upload progress: ${progress.toFixed(1)}%`, "info")
                }
              },
              (error: any) => output(`Upload error: ${error.message}`, "error"),
              () => {
                uploadTask.snapshot.ref.getDownloadURL().then((downloadURL: string) => {
                  output(
                    `Upload successful!\nFile: ${path}\nSize: ${uploadTask.snapshot.totalBytes} bytes\nDownload URL: ${downloadURL}`,
                    "success"
                  )
                })
              }
            )
          } catch (error: any) {
            output(`Error: ${error.message}`, "error")
          }
          break
        }
        case "download": {
          if (!path) {
            output("Please specify a storage path to download", "error")
            return
          }
          try {
            w.storageService
              .ref(path)
              .getDownloadURL()
              .then((url: string) => {
                output(`Download URL for: ${path}\nURL: ${url}`, "success")
              })
              .catch((error: any) => output(`Download error: ${error.message}`, "error"))
          } catch (error: any) {
            output(`Error: ${error.message}`, "error")
          }
          break
        }
        case "delete": {
          if (!path) {
            output("Please specify a storage path to delete", "error")
            return
          }
          try {
            w.storageService
              .ref(path)
              .delete()
              .then(() => output(`Deleted: ${path}`, "success"))
              .catch((error: any) => output(`Delete error: ${error.message}`, "error"))
          } catch (error: any) {
            output(`Error: ${error.message}`, "error")
          }
          break
        }
        case "get_metadata": {
          if (!path) {
            output("Please specify a storage path to get metadata", "error")
            return
          }
          try {
            w.storageService
              .ref(path)
              .getMetadata()
              .then((metadata: any) => {
                output(`Metadata for: ${path}\n${formatJsonOutput(metadata)}`, "success")
              })
              .catch((error: any) => output(`Metadata error: ${error.message}`, "error"))
          } catch (error: any) {
            output(`Error: ${error.message}`, "error")
          }
          break
        }
        default:
          output("Invalid storage operation", "error")
      }
    },
    [output]
  )

  return (
    <FirebaseContext.Provider
      value={{
        state,
        logs,
        initFirebase,
        output,
        clearLogs,
        signIn,
        signUp,
        signOut: signOutFn,
        googleOAuth,
        showMfaDialog,
        setShowMfaDialog,
        verifyMfaCode,
        cancelMfa,
        firestoreOp,
        invokeCloudFunction,
        storageOp,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  )
}

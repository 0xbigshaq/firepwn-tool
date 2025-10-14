// globals
window.authService = null;
window.firestoreService = null;
window.functionsService = null;
window.storageService = null;
window.app = null;

outputLog = null;

let nextAuthLogMessage = null;
let logClearButton = null;

const THEME_STORAGE_KEY = "firepwn-theme";
const THEME_DARK = "dark";
const THEME_LIGHT = "light";

function showToast(message, options = {}) {
  const toastOptions = Object.assign(
    {
      html: message,
      displayLength: 4000,
    },
    options
  );

  return M.toast(toastOptions);
}

function getStoredThemePreference() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (e) {
    console.warn("Unable to access localStorage for theme preference", e);
    return null;
  }
}

function persistThemePreference(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.warn("Unable to persist theme preference", e);
  }
}

function resolvePreferredTheme() {
  const storedTheme = getStoredThemePreference();
  if (storedTheme) {
    return storedTheme;
  }

  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return THEME_DARK;
  }

  return THEME_LIGHT;
}

function updateThemeToggleVisual(theme) {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) {
    return;
  }

  const icon = toggleBtn.querySelector(".material-icons");
  const label = toggleBtn.querySelector(".theme-toggle__label");

  if (theme === THEME_DARK) {
    toggleBtn.classList.add("theme-toggle--dark");
    if (icon) {
      icon.textContent = "light_mode";
    }
    if (label) {
      label.textContent = "Light mode";
    }
  } else {
    toggleBtn.classList.remove("theme-toggle--dark");
    if (icon) {
      icon.textContent = "dark_mode";
    }
    if (label) {
      label.textContent = "Dark mode";
    }
  }
}

function applyTheme(theme) {
  const isDark = theme === THEME_DARK;
  document.body.classList.toggle("theme-dark", isDark);
  updateThemeToggleVisual(theme);
}

function setupThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) {
    return;
  }

  let explicitPreference = getStoredThemePreference();
  let activeTheme = resolvePreferredTheme();
  applyTheme(activeTheme);

  const mediaQuery = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  if (mediaQuery) {
    const handleChange = (event) => {
      if (explicitPreference) {
        return;
      }
      activeTheme = event.matches ? THEME_DARK : THEME_LIGHT;
      applyTheme(activeTheme);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }
  }

  toggleBtn.addEventListener("click", () => {
    activeTheme = activeTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    applyTheme(activeTheme);
    persistThemePreference(activeTheme);
    explicitPreference = activeTheme;
    showToast(`Switched to ${activeTheme} mode`);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  outputLog = document.getElementById("output-log");
  logClearButton = document.getElementById("log-clear");
  if (logClearButton) {
    logClearButton.addEventListener("click", clearLog);
    logClearButton.disabled = !outputLog || outputLog.children.length === 0;
  }
  // materialize stuff
  const collapsibleElems = document.querySelectorAll(".collapsible");
  M.Collapsible.init(collapsibleElems);
  const selectElems = document.querySelectorAll("select");
  M.FormSelect.init(selectElems);

  const initCollapsible = document.querySelector("#init-collapsible");
  const instance = initCollapsible
    ? M.Collapsible.getInstance(initCollapsible)
    : null;
  if (instance) {
    instance.open();
  }

  setupThemeToggle();

  // init form

  const initForm = document.querySelector("#init-form");
  if (!initForm) {
    return;
  }

  initForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // fetch json init
    const input_apiKey = initForm["apiKey"];
    const input_authDomain = initForm["authDomain"];
    const input_databaseURL = initForm["databaseURL"];
    const input_projectId = initForm["projectId"];
    const input_storageBucket = initForm["storageBucket"];
    const input_btnInit = initForm["btn-init"];

    // create a firebaseConfig
    const firebaseConfig = {
      apiKey: input_apiKey.value,
      authDomain: input_authDomain.value,
      databaseURL: input_databaseURL.value,
      projectId: input_projectId.value,
    };

    // add storageBucket if provided
    if (input_storageBucket.value.trim()) {
      firebaseConfig.storageBucket = input_storageBucket.value;
    }

    // init firebase
    try {
      app = firebase.initializeApp(firebaseConfig);
    } catch (e) {
      console.log(e);
      showToast(e.message);
      app.delete(app); // prevent duplicate db error
    }

    // init firebase services
    firestoreService = firebase.firestore();
    authService = firebase.auth();
    functionsService = firebase.functions();
    
    // initialize storage service if storageBucket is provided
    if (firebaseConfig.storageBucket) {
      storageService = firebase.storage();
      output(`Storage service initialized with bucket: ${firebaseConfig.storageBucket}`);
    } else {
      output(`Storage service not initialized (no storageBucket provided)`);
    }

    // update DOM
    const initInputs = [
      input_apiKey,
      input_authDomain,
      input_databaseURL,
      input_projectId,
      input_storageBucket,
      input_btnInit,
    ];
    initInputs.forEach((field) => {
      field.disabled = true;
    });
    input_btnInit.textContent = "Initialized";
    input_btnInit.classList.remove("yellow", "darken-2");
    input_btnInit.classList.add("green", "darken-2");
    showToast("Firebase initialized");

    // show gui
    const initCollapsiblePanel = document.querySelector("#init-collapsible");
    const initInstance = initCollapsiblePanel
      ? M.Collapsible.getInstance(initCollapsiblePanel)
      : null;
    if (initInstance) {
      initInstance.close();
    }
    const ui = document.getElementById("ui");
    if (ui) {
      ui.style.display = "block";
    }

    // Setup MFA input handler
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && document.getElementById('mfa-section').style.display !== 'none') {
        e.preventDefault();
        verifyMfaCode();
      }
    });

    // register a auth event

    authService.onAuthStateChanged((user) => {
      const authPane = document.querySelector("#auth-pane");
      const status = document.querySelector("#auth-status");
      if (!authPane || !status) {
        return;
      }
      if (user) {
        const email = user.email ? escapeHtml(user.email) : "(no email)";
        const uidDisplay = escapeHtml(user.uid);
        status.innerHTML = `logged in as ${email} <br />
                <span class="uid-line">
                  <span class="uid-label">UID:</span>
                  <span class="uid-display">${uidDisplay}</span>
                  <button type="button" class="btn-flat icon-button uid-copy-btn" data-uid="" aria-label="Copy user UID">
                    <i class="material-icons" aria-hidden="true">content_copy</i>
                  </button>
                </span>
                <p></p>
                <button type="button" class="btn yellow darken-2 z-depth-0 sign-out-btn">Sign out</button>
                `;
        const copyBtn = status.querySelector(".uid-copy-btn");
        if (copyBtn) {
          copyBtn.dataset.uid = user.uid;
        }

        const signOutBtn = status.querySelector(".sign-out-btn");
        if (signOutBtn) {
          signOutBtn.addEventListener("click", () => {
            authService
              .signOut()
              .then(() => {
                showToast("Signed out");
                output("Logged out");
              })
              .catch((e) => {
                console.error(e);
                showToast(e.message || "Failed to sign out");
              });
          });
        }
        console.log("logged in ", user.email);
        const logMessage =
          nextAuthLogMessage ||
          `Logged in (${user.email ? escapeHtml(user.email) : "unknown"})`;
        output(logMessage);
        nextAuthLogMessage = null;
        authPane.style.display = "none";
        // Hide MFA dialog if user successfully logged in
        document.getElementById('mfa-section').style.display = 'none';
      } else {
        status.innerHTML = `Not logged in`;
        authPane.style.display = "block";
        // Make sure MFA dialog is hidden when not logged in
        document.getElementById('mfa-section').style.display = 'none';
      }
    });
  });

  // db explorer
  const opSelect = document.querySelector("#op-name");
  if (opSelect) {
    opSelect.addEventListener("change", (e) => {
      const jsonField = document.querySelector("#op-json");
      if (!jsonField) {
        return;
      }
      if (["set", "update"].includes(e.target.value)) {
        jsonField.style.display = "block";
        // Show merge option only for 'set' operation
        if (e.target.value === 'set') {
          document.querySelector('#merge-option').style.display = "block";
        } else {
          document.querySelector('#merge-option').style.display = "none";
        }
      } else {
        jsonField.style.display = "none";
        document.querySelector('#merge-option').style.display = "none";
      }
    });
  }

  // storage explorer
  const storageOpSelect = document.querySelector("#storage-op-name");
  if (storageOpSelect) {
    storageOpSelect.addEventListener("change", (e) => {
      if (e.target.value === 'upload') {
        // toggle<show>
        document.querySelector('#storage-upload').style.display = "block";
      } else {
        // toggle<hide>
        document.querySelector('#storage-upload').style.display = "none";
      }
    });
  }

  // auth service

  const loginForm = document.querySelector("#signin-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      let email = loginForm["email"].value;
      let password = loginForm["password"].value;

      try {
        authService
          .signInWithEmailAndPassword(email, password)
          .then((creds) => {
            console.log(creds.user.email);
            console.log(creds.user.uid);
          })
          .catch((e) => {
            console.log(e);
            
            // Check if MFA is required
            if (e.code === 'auth/multi-factor-auth-required') {
              // Store the resolver and show MFA UI
              window.mfaResolver = e.resolver;
              showMfaDialog();
              output(`<b>MFA Required:</b> Please enter your verification code.`);
            } else {
              showToast(e.message);
              output(
                `<b>Error:</b> Firebase auth failed. For more info, open the browser's console.`
              );
            }
          });
      } catch (e) {
        showToast(e.message);
      }
    });
  }

  const signupForm = document.querySelector("#signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();

      let email = signupForm["email"].value;
      let password = signupForm["password"].value;

      try {
        authService
          .createUserWithEmailAndPassword(email, password)
          .then((creds) => {
            output(`Account created (${creds.user.email})`);
            console.log(creds.user.email);
            console.log(creds.user.uid);
          })
          .catch((e) => {
            showToast(e.message);
          });
      } catch (e) {
        showToast(e.message);
      }
    });
  }

  const googleOAuthForm = document.querySelector("#google-oauth-form");
  if (googleOAuthForm) {
    googleOAuthForm.addEventListener("submit", (e) => {
      e.preventDefault();

      let idTokenField = googleOAuthForm["oauthIdToken"];
      let idToken = idTokenField.value.trim();

      if (!idToken) {
        showToast("Please provide an OAuth ID token.");
        return;
      }

      try {
        let credential = firebase.auth.GoogleAuthProvider.credential(idToken);
        authService
          .signInWithCredential(credential)
          .then((creds) => {
            let email = creds.user.email
              ? escapeHtml(creds.user.email)
              : "no email provided";
            nextAuthLogMessage = `Logged in via Google OAuth (${email})`;
            idTokenField.value = "";
            M.textareaAutoResize(idTokenField);
          })
          .catch((e) => {
            showToast(e.message);
            output(
              `<b>Error:</b> Google OAuth sign-in failed. For more info, open the browser's console.`
            );
            console.log(e);
          });
      } catch (e) {
        showToast(e.message);
        console.log(e);
      }
    });
  }

  // firestore service

  const exploreForm = document.querySelector("#firestore-explorer");
  if (exploreForm) {
    exploreForm.addEventListener("submit", (e) => {
      e.preventDefault();

      let collection_name = exploreForm["collection_name"].value;
      let op = exploreForm["op"].value;
      let jsonInput = exploreForm["json-input"].value;
      let docId = exploreForm["docId"].value;
      let limit = parseInt(exploreForm["limit"].value) || 100;
      let sortField = exploreForm["sort_field"].value.trim();
      let sortDirection = exploreForm["sort_direction"].value;
      let filterField = exploreForm["filter_field"].value.trim();
      let filterOp = exploreForm["filter_op"].value;
      let filterValue = exploreForm["filter_value"].value.trim();
      let mergeEnabled = exploreForm["merge_enabled"] ? exploreForm["merge_enabled"].checked : false;
      let data = "";

      // Validation for sorting parameters
      if (sortField && ['set', 'update', 'delete'].includes(op)) {
        showToast('Sorting is only available for GET operations');
        return;
      }

      if (sortField && docId) {
        showToast('Sorting cannot be used when querying a specific document ID');
        return;
      }

      // Basic field name validation
      if (sortField && !/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(sortField)) {
        showToast('Invalid sort field name. Use only letters, numbers, dots, and underscores. Must start with a letter.');
        return;
      }

      // Validation for filter parameters
      if ((filterField || filterOp || filterValue) && ['set', 'update', 'delete'].includes(op)) {
        showToast('Filtering is only available for GET operations');
        return;
      }

      if (filterField && docId) {
        showToast('Filtering cannot be used when querying a specific document ID');
        return;
      }

      // Validate filter field name
      if (filterField && !/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(filterField)) {
        showToast('Invalid filter field name. Use only letters, numbers, dots, and underscores. Must start with a letter.');
        return;
      }

      // Validate that if filter field is provided, operator and value are also provided
      if (filterField && (!filterOp || !filterValue)) {
        showToast('When using filters, you must specify field, operator, and value');
        return;
      }

      if (filterOp && (!filterField || !filterValue)) {
        showToast('When using filters, you must specify field, operator, and value');
        return;
      }

      if (["set", "update"].includes(op)) {
        try {
          eval(`jsonInput = [${jsonInput}]; jsonInput = jsonInput[0];`); // yuck. It is what it is
          console.log(jsonInput);
        } catch (e) {
          showToast(`Please enter a valid JSON object`);
          return;
        }

        // set
        if (op == "set") {
          try {
            if (docId) {
              // Use merge option conditionally
              let setOptions = mergeEnabled ? { merge: true } : {};
              let operationType = mergeEnabled ? 'merged' : 'overwritten/created';
              
              firestoreService
                .collection(collection_name)
                .doc(docId)
                .set(jsonInput, setOptions)
                .then(() => {
                  console.log(
                    `Document was ${operationType} (ID: ${docId})`
                  );
                  output(
                    `<b>Document ${operationType} (ID: ${docId})</b> ${mergeEnabled ? '(with merge: true)' : ''} <br /><b>Result: </b> ${formatJsonOutput(jsonInput)}`
                  );
                })
                .catch((e) => {
                  output(`<b>Error:</b> ${e.message}`);
                });
            } else {
              // When adding a new document (no docId), merge doesn't apply
              firestoreService
                .collection(collection_name)
                .add(jsonInput)
                .then((docref) => {
                  console.log("firestore response: ", docref);
                  output(
                    `<b>Response</b>: <br /> Document added (ID: ${docref.id})`
                  );
                })
                .catch((e) => {
                  output(`<b>Error:</b> ${e.message}`);
                  console.log(e);
                });
            }
          } catch (e) {
            console.log(e);
            output(`<b>Error:</b> ${e.message}`);
          }
        }

        // update docment
        else if (op == "update") {
          try {
            if (docId) {
              firestoreService
                .collection(collection_name)
                .doc(docId)
                .update(jsonInput)
                .then(() => {
                  console.log(`Updated(Doc ID: ${docId})`);
                  output(
                    `<b>Updated fields(Doc ID: ${docId})</b><br /> ${formatJsonOutput(jsonInput)}`
                  );
                })
                .catch((e) => {
                  output(`<b>Error:</b> ${e.message}`);
                });
            } else {
              throw {
                message: `Document ID field is mandatory when trying to delete/update a record`,
              };
            }
          } catch (e) {
            console.log(e);
            output(`<b>Error:</b> ${e.message}`);
          }
        }
      } else {
        // get
        if (op == "get") {
          try {
            if (docId) {
              // get a specific document
              firestoreService
                .collection(collection_name)
                .doc(docId)
                .get()
                .then((snapshot) => {
                  data = snapshot.data();
                  if (!data) {
                    throw { message: `Document ${docId} not found` };
                  }
                  console.log("firestore response: ", data);
                  const safeDocId = escapeHtml(docId);
                  const safeCollection = escapeHtml(collection_name);
                  output(
                    `<b>Getting <i>${safeDocId}</i> from <i>${safeCollection}</i> </b> <br /> <b>Response</b>: <br /> ${formatJsonOutput(data)}`
                  );
                })
                .catch((e) => {
                  output(`Error: ${e.message}`);
                });
            } else {
              // get all documents inside a specific collection
              let query = firestoreService.collection(collection_name);
              
              // Add filtering if filter is specified
              if (filterField && filterOp && filterValue) {
                // Parse filter value (handle JSON for arrays/objects)
                let parsedFilterValue;
                try {
                  // Try to parse as JSON first (for arrays, objects, booleans, numbers)
                  if (filterValue.startsWith('[') || filterValue.startsWith('{') || 
                      filterValue === 'true' || filterValue === 'false' || 
                      !isNaN(filterValue)) {
                    parsedFilterValue = JSON.parse(filterValue);
                  } else {
                    // Keep as string
                    parsedFilterValue = filterValue;
                  }
                } catch (e) {
                  // If JSON parsing fails, treat as string
                  parsedFilterValue = filterValue;
                }
                
                console.log(`Applying filter: ${filterField} ${filterOp}`, parsedFilterValue);
                query = query.where(filterField, filterOp, parsedFilterValue);
              }
              
              // Add sorting if sort field is specified
              if (sortField) {
                query = query.orderBy(sortField, sortDirection);
              }
              
              // Apply limit
              query = query.limit(limit);
              
              query.get()
                .then((snapshots) => {
                  const safeCollection = escapeHtml(collection_name);
                  let filterInfo = filterField ? ` (filtered by ${filterField} ${filterOp} ${filterValue})` : '';
                  let sortInfo = sortField ? ` (sorted by ${sortField} ${sortDirection})` : '';
                  let result = `<b>Getting documents from <i>${safeCollection}</i> (limit: ${limit})${filterInfo}${sortInfo}</b> <br />`;
                  result += `<b>Response (${snapshots.docs.length} documents)</b>: <br />`;
                  console.log("firestore response: ");
                  if (!snapshots.docs.length) {
                    throw { message: `empty response` };
                  }
                  snapshots.docs.forEach((doc) => {
                    data = doc.data();
                    console.log(data);
                    result += `<b>Document ID:</b> ${doc.id}<br />`;
                    result += formatJsonOutput(data);
                  });
                  output(result);
                })
                .catch((e) => {
                  // Enhanced error handling for sort and filter related errors
                  let errorMessage = e.message;
                  if (e.code === 'failed-precondition' && sortField) {
                    errorMessage = `Cannot sort by '${sortField}': This field may not be indexed. To sort by this field, you need to create a composite index in Firebase Console.`;
                  } else if (e.code === 'failed-precondition' && filterField) {
                    errorMessage = `Cannot filter by '${filterField}': This field may not be indexed, or you need to create a composite index for this query in Firebase Console.`;
                  } else if (e.code === 'invalid-argument' && sortField) {
                    errorMessage = `Invalid sort field '${sortField}': Please check the field name and ensure it exists in your documents.`;
                  } else if (e.code === 'invalid-argument' && filterField) {
                    errorMessage = `Invalid filter: Please check the field name '${filterField}' and filter value '${filterValue}'.`;
                  }
                  output(`Error: ${errorMessage}`);
                  console.log(e);
                });
            }
          } catch (e) {
            console.log(e);
            output(`Error: ${e.message}`);
          }

          // delete
        } else if (op == "delete") {
          try {
            if (docId) {
              firestoreService
                .collection(collection_name)
                .doc(docId)
                .delete()
                .then(() => {
                  console.log(`Deleted(Doc ID: ${docId})`);
                  output(`<b>Deleted</b>(Doc ID: ${docId})`);
                })
                .catch((e) => {
                  output(`Error: ${e.message}`);
                });
            } else {
              throw {
                message: `Document ID field is mandatory when trying to delete/update a record`,
              };
            }
          } catch (e) {
            console.log(e);
            output(`Error: ${e.message}`);
          }
        }
      }
    });
  }

  // cloud functions service

  // invoke a cloud function
  const cloudfuncForm = document.querySelector("#invoke-cf-form");
  if (cloudfuncForm) {
    cloudfuncForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // fetch info from dom
      let cloudCmd = cloudfuncForm["cloud-cmd"].value;
      let funcName = cloudCmd.split("(")[0];
      let funcParams = cloudCmd.split(funcName)[1];

      // validations
      let validateFunc = /^[a-zA-Z][a-zA-Z0-9]+([ ]|[a-zA-Z])\(/gm;
      if (!validateFunc.exec(cloudCmd)) {
        showToast(`Please enter a valid invoke syntax`);
        return;
      }

      if (funcParams[funcParams.length - 1] != ")") {
        showToast(
          `Please enter a valid invoke syntax. <br />Reason: The input is not ending with  ')'`
        );
        return;
      }

      // start invoke
      let result = `<b>Invoke</b>: ${cloudCmd} <br />`;

      cloudCallback = functionsService.httpsCallable(funcName);
      try {
        eval(`cloudCallback${funcParams}.then(response => {
                result += "<b>Response: </b> <br />";
                result += escapeHtml(JSON.stringify(response));
                output(result);
            }).catch(e => {
                console.log(e);
                result += "<b>Error:</b> Cannot invoke <i>${funcName}</i>. ";
                if(e.message == 'internal') {
                    result += "<br /><b>Reason</b>: Unknown. ";
                } else if (e.message == 'not-found') {
                    result += "<br /><b>Reason</b>: Cloud Function not found. ";
                }
                result += "For more info, open the browser's console.";
                output(result);
            })`);
      } catch (e) {
        showToast(
          "Invalid invoke syntax. For more information, open the browser's console."
        );
        console.log(e);
      }
    });
  }

  // storage service

  // storage explorer form
  const storageForm = document.querySelector("#storage-explorer");
  if (storageForm) {
    storageForm.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!storageService) {
        showToast('Storage service not initialized. Please provide a storageBucket in configuration.');
        output(`<b>Error:</b> Storage service not available. Please reinitialize with a storageBucket.`);
        return;
      }

      let storage_path = storageForm["storage_path"].value;
      let storage_op = storageForm["storage_op"].value;
      let storage_limit = parseInt(storageForm["storage_limit"].value) || 100;
      let file_upload = storageForm["file_upload"].files[0];

      switch (storage_op) {
        case 'list':
          try {
            let listRef = storage_path ? storageService.ref(storage_path) : storageService.ref();
            listRef.listAll().then(result => {
              let itemsCount = Math.min(result.items.length, storage_limit);
              let foldersCount = Math.min(result.prefixes.length, storage_limit);
              
              let output_text = `<b>Listing storage contents</b><br/>`;
              output_text += `<b>Path:</b> ${storage_path || '(root)'}<br/>`;
              output_text += `<b>Files (${itemsCount}/${result.items.length}):</b><br/>`;
              
              for (let i = 0; i < itemsCount; i++) {
                let item = result.items[i];
                output_text += `📄 ${item.fullPath}<br/>`;
              }
              
              output_text += `<b>Folders (${foldersCount}/${result.prefixes.length}):</b><br/>`;
              for (let i = 0; i < foldersCount; i++) {
                let prefix = result.prefixes[i];
                output_text += `📁 ${prefix.fullPath}<br/>`;
              }
              
              output(output_text);
            }).catch(error => {
              output(`<b>Error listing storage:</b> ${error.message}`);
              console.error('Storage list error:', error);
            });
          } catch (error) {
            output(`<b>Error:</b> ${error.message}`);
            console.error('Storage list error:', error);
          }
          break;

        case 'upload':
          if (!file_upload) {
            showToast('Please select a file to upload');
            return;
          }
          
          if (!storage_path) {
            showToast('Please specify a storage path for the upload');
            return;
          }

          try {
            let uploadRef = storageService.ref(storage_path);
            let uploadTask = uploadRef.put(file_upload);
            
            output(`<b>Uploading file:</b> ${file_upload.name} to ${storage_path}...`);
            
            uploadTask.on('state_changed', 
              (snapshot) => {
                let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                output(`<b>Upload progress:</b> ${progress.toFixed(1)}%`);
              }, 
              (error) => {
                output(`<b>Upload error:</b> ${error.message}`);
                console.error('Upload error:', error);
              }, 
              () => {
                uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                  output(`<b>Upload successful!</b><br/>
                          <b>File:</b> ${storage_path}<br/>
                          <b>Size:</b> ${uploadTask.snapshot.totalBytes} bytes<br/>
                          <b>Download URL:</b> <a href="${downloadURL}" target="_blank">${downloadURL}</a>`);
                });
              }
            );
          } catch (error) {
            output(`<b>Error:</b> ${error.message}`);
            console.error('Upload error:', error);
          }
          break;

        case 'download':
          if (!storage_path) {
            showToast('Please specify a storage path to download');
            return;
          }

          try {
            let downloadRef = storageService.ref(storage_path);
            downloadRef.getDownloadURL().then(url => {
              output(`<b>Download URL for:</b> ${storage_path}<br/>
<b>URL:</b> <a href="${url}" target="_blank" download>${url}</a><br/>
<button onclick="window.open('${url}', '_blank')" class="btn yellow darken-2 z-depth-0">Open in new tab</button>`);
            }).catch(error => {
              output(`<b>Download error:</b> ${error.message}`);
              console.error('Download error:', error);
            });
          } catch (error) {
            output(`<b>Error:</b> ${error.message}`);
            console.error('Download error:', error);
          }
          break;

        case 'delete':
          if (!storage_path) {
            showToast('Please specify a storage path to delete');
            return;
          }

          try {
            let deleteRef = storageService.ref(storage_path);
            deleteRef.delete().then(() => {
              output(`<b>Deleted:</b> ${storage_path}`);
            }).catch(error => {
              output(`<b>Delete error:</b> ${error.message}`);
              console.error('Delete error:', error);
            });
          } catch (error) {
            output(`<b>Error:</b> ${error.message}`);
            console.error('Delete error:', error);
          }
          break;

        case 'get_metadata':
          if (!storage_path) {
            showToast('Please specify a storage path to get metadata');
            return;
          }

          try {
            let metadataRef = storageService.ref(storage_path);
            metadataRef.getMetadata().then(metadata => {
              output(`<b>Metadata for:</b> ${storage_path}<br/>
                      ${formatJsonOutput(metadata)}`);
            }).catch(error => {
              output(`<b>Metadata error:</b> ${error.message}`);
              console.error('Metadata error:', error);
            });
          } catch (error) {
            output(`<b>Error:</b> ${error.message}`);
            console.error('Metadata error:', error);
          }
          break;

        default:
          showToast('Invalid storage operation');
          break;
      }
    });
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest
      ? event.target.closest(".uid-copy-btn")
      : null;
    if (!target) {
      return;
    }

    const uid = target.getAttribute("data-uid");
    if (!uid) {
      showToast("No UID available to copy");
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(uid)
        .then(() => {
          showToast("UID copied to clipboard");
        })
        .catch((err) => {
          console.error(err);
          fallbackCopyToClipboard(uid);
        });
      return;
    }

    fallbackCopyToClipboard(uid);
  });
});

function clearLog() {
  if (!outputLog) {
    return;
  }

  outputLog.innerHTML = "";
  showToast("Log cleared");
  if (logClearButton) {
    logClearButton.disabled = true;
  }
}

function fallbackCopyToClipboard(text) {
  const tempInput = document.createElement("textarea");
  tempInput.value = text;
  tempInput.setAttribute("readonly", "");
  tempInput.style.position = "absolute";
  tempInput.style.left = "-9999px";
  document.body.appendChild(tempInput);
  tempInput.select();
  try {
    const succeeded = document.execCommand("copy");
    if (succeeded) {
      showToast("UID copied to clipboard");
    } else {
      showToast("Unable to copy UID");
    }
  } catch (err) {
    console.error("Copy command failed", err);
    showToast("Unable to copy UID");
  } finally {
    document.body.removeChild(tempInput);
  }
}

function output(data) {
  if (!outputLog) {
    return;
  }

  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("article");
  entry.className = "log-entry";
  entry.innerHTML = `
    <header class="log-entry__header">
      <span class="log-entry__time">${escapeHtml(time)}</span>
    </header>
    <div class="log-entry__body">${data}</div>
  `;

  const separator = document.createElement("hr");
  separator.className = "log-entry__divider";

  outputLog.insertBefore(separator, outputLog.firstChild);
  outputLog.insertBefore(entry, separator);

  if (logClearButton) {
    logClearButton.disabled = false;
  }
}

function escapeHtml(data) {
  // making the output less messy in case the firestore db contains entries with html tags in it
  return data
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatJsonOutput(jsonData) {
  // Prettify the JSON with 2-space indentation
  const prettified = JSON.stringify(jsonData, null, 2);
  // Escape HTML and wrap in a styled div
  const escaped = escapeHtml(prettified);
  return `<div class="json-output">${escaped}</div>`;
}

// MFA Helper Functions
function showMfaDialog() {
  if (!window.mfaResolver || !window.mfaResolver.hints) {
    console.error('No MFA resolver or hints available');
    return;
  }
  
  // Show the MFA input section
  document.getElementById('mfa-section').style.display = 'block';
  document.getElementById('auth-pane').style.display = 'none';
  
  // Update UI based on MFA factor type
  const enrolledFactors = window.mfaResolver.hints;
  const factorInfo = document.getElementById('mfa-factor-info');
  
  if (enrolledFactors.length > 0) {
    const selectedHint = enrolledFactors[0];
    let factorDescription = '';
    
    if (selectedHint.factorId === firebase.auth.PhoneAuthProvider.PROVIDER_ID || 
        selectedHint.factorId === 'phone') {
      factorDescription = 'SMS verification code';
    } else {
      factorDescription = 'Verification code';
    }
    
    if (factorInfo) {
      factorInfo.textContent = `Enter your 6-digit ${factorDescription}:`;
    }
  }
  
  // Focus on the MFA input
  setTimeout(() => {
    document.getElementById('mfa-code').focus();
  }, 100);
}

function hideMfaDialog() {
  document.getElementById('mfa-section').style.display = 'none';
  document.getElementById('auth-pane').style.display = 'block';
  document.getElementById('mfa-code').value = '';
}

function verifyMfaCode() {
  const code = document.getElementById('mfa-code').value.trim();
  
  if (!code) {
    showToast('Please enter a verification code');
    return;
  }
  
  if (!window.mfaResolver) {
    showToast('MFA session expired. Please try logging in again.');
    hideMfaDialog();
    return;
  }
  
  // Get enrolled factors
  const enrolledFactors = window.mfaResolver.hints;
  if (!enrolledFactors || enrolledFactors.length === 0) {
    showToast('No MFA factors found. Please contact support.');
    return;
  }
  
  const selectedHint = enrolledFactors[0];
  console.log('MFA Factor Details:', selectedHint);
  console.log('MFA Factor Type:', selectedHint.factorId);
  console.log('Phone number:', selectedHint.phoneNumber);
  
  output(`<b>MFA Verification:</b> Attempting to verify ${selectedHint.factorId} code...`);
  
  // For Firebase v7 MFA, we might need to check if verification is already available
  let assertion;
  try {
    if (selectedHint.factorId === firebase.auth.PhoneAuthProvider.PROVIDER_ID || 
        selectedHint.factorId === 'phone') {
      
      if (!code) {
        showToast('Please enter the SMS verification code you received');
        return;
      }
      
      if (code.length !== 6) {
        showToast('Verification codes must be 6 digits');
        return;
      }
      
      // Check if we have a stored verification ID from previous attempt
      if (window.mfaVerificationId) {
        // Use stored verification ID to verify the code
        const credential = firebase.auth.PhoneAuthProvider.credential(
          window.mfaVerificationId,
          code
        );
        assertion = firebase.auth.PhoneMultiFactorGenerator.assertion(credential);
      } else {
        // We need to send SMS first using reCAPTCHA
        showToast('Setting up SMS verification...');
        output(`<b>MFA Setup:</b> Preparing to send SMS verification...`);
        
        // Create reCAPTCHA verifier if it doesn't exist
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('mfa-recaptcha', {
            'size': 'invisible',
            'callback': function(response) {
              console.log('reCAPTCHA solved:', response);
            },
            'expired-callback': function() {
              console.log('reCAPTCHA expired');
              window.recaptchaVerifier = null;
            }
          });
        }
        
        const phoneInfoOptions = {
          multiFactorHint: selectedHint,
          session: window.mfaResolver.session
        };
        
        const phoneAuthProvider = new firebase.auth.PhoneAuthProvider();
        
        phoneAuthProvider.verifyPhoneNumber(
          phoneInfoOptions,
          window.recaptchaVerifier
        ).then(verificationId => {
          window.mfaVerificationId = verificationId;
          showToast('SMS sent! Please enter the verification code.');
          output(`<b>MFA SMS:</b> Verification code sent to ${selectedHint.phoneNumber || 'your phone'}. Please enter the 6-digit code.`);
          document.getElementById('mfa-code').focus();
        }).catch(smsError => {
          console.error('Error sending SMS:', smsError);
          showToast('Failed to send SMS: ' + smsError.message);
          output(`<b>MFA Error:</b> Failed to send SMS - ${smsError.message}`);
          
          // Reset reCAPTCHA on error
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
          }
        });
        return; // Exit here, wait for SMS to be sent
      }
    } else {
      showToast('Unsupported MFA factor type: ' + selectedHint.factorId + '. This Firebase version only supports SMS MFA.');
      return;
    }
  } catch (error) {
    console.error('Error creating MFA assertion:', error);
    showToast('Error creating verification assertion');
    return;
  }
  
  // Resolve the MFA challenge
  window.mfaResolver.resolveSignIn(assertion).then(result => {
    console.log('MFA verification successful:', result.user.email);
    output(`<b>MFA Success:</b> Logged in as ${result.user.email} (uid: ${result.user.uid})`);
    hideMfaDialog();
    window.mfaResolver = null;
  }).catch(error => {
    console.error('MFA verification failed:', error);
    
    let errorMessage = 'MFA verification failed';
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Invalid verification code. Please check your authenticator app and try again.';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'Verification code has expired. Please try logging in again.';
    } else if (error.code === 'auth/session-cookie-expired') {
      errorMessage = 'MFA session expired. Please try logging in again.';
      hideMfaDialog();
      return;
    } else {
      errorMessage = 'MFA verification failed: ' + error.message;
    }
    
    showToast(errorMessage);
    output(`<b>MFA Error:</b> ${errorMessage}`);
    document.getElementById('mfa-code').value = '';
    document.getElementById('mfa-code').focus();
  });
}

function cancelMfa() {
  window.mfaResolver = null;
  hideMfaDialog();
  output(`<b>MFA Cancelled:</b> Login cancelled by user.`);
}

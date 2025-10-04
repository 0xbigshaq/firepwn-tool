// globals
window.authService = null;
window.firestoreService = null;
window.functionsService = null;
window.app = null;

outputLog = null;

let nextAuthLogMessage = null;

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
    const input_btnInit = initForm["btn-init"];

    // create a firebaseConfig
    let firebaseConfig = {
      apiKey: input_apiKey.value,
      authDomain: input_authDomain.value,
      databaseURL: input_databaseURL.value,
      projectId: input_projectId.value,
    };

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

    // update DOM
    input_apiKey.disabled = true;
    input_authDomain.disabled = true;
    input_databaseURL.disabled = true;
    input_projectId.disabled = true;
    input_btnInit.disabled = true;
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
      } else {
        status.innerHTML = `Not logged in`;
        authPane.style.display = "block";
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
      } else {
        jsonField.style.display = "none";
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
            showToast(e.message);
            console.log(e);
            output(
              `<b>Error:</b> Firebase auth failed. For more info, open the browser's console.`
            );
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
      let data = "";

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
              firestoreService
                .collection(collection_name)
                .doc(docId)
                .set(jsonInput)
                .then(() => {
                  console.log(
                    `Document was overwritten/created (ID: ${docId})`
                  );
                  output(
                    `<b>Document overwritten/created (ID: ${docId})</b> <br /><b>Result: </b> ${escapeHtml(
                      JSON.stringify(jsonInput)
                    )}`
                  );
                })
                .catch((e) => {
                  output(`<b>Error:</b> ${e.message}`);
                });
            } else {
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
                    `<b>Updated fields(Doc ID: ${docId})</b><br /> ${escapeHtml(
                      JSON.stringify(jsonInput)
                    )}`
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
                    `<b>Getting <i>${safeDocId}</i> from <i>${safeCollection}</i> </b> <br /> <b>Response</b>: <br /> ${escapeHtml(
                      JSON.stringify(data)
                    )}`
                  );
                })
                .catch((e) => {
                  output(`Error: ${e.message}`);
                });
            } else {
              // get all documents inside a specific collection
              firestoreService
                .collection(collection_name)
                .get()
                .then((snapshots) => {
                  const safeCollection = escapeHtml(collection_name);
                  let result = `<b>Getting all documents from <i>${safeCollection}</i></b><br /><b>Response</b>: <br />`;
                  console.log("firestore response: ");
                  if (!snapshots.docs.length) {
                    throw { message: `empty response` };
                  }
                  snapshots.docs.forEach((doc) => {
                    data = doc.data();
                    console.log(data);
                    result += escapeHtml(JSON.stringify(data)) + "<br />";
                  });
                  output(result);
                })
                .catch((e) => {
                  output(`Error: ${e.message}`);
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

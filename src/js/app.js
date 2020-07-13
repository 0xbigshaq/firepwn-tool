// globals
window.authService = null;
window.firestoreService = null;
window.functionsService = null;
window.app = null;

outputLog = null;

document.addEventListener('DOMContentLoaded', function() {
    outputLog = document.getElementById('output-log');
    // materialize stuff
    var elems = document.querySelectorAll('.collapsible');
    M.Collapsible.init(elems);
    retval = document.querySelectorAll('select');
    M.FormSelect.init(retval);

    elem = document.querySelector('#init-collapsible');
    let instance = M.Collapsible.getInstance(elem);
    instance.open();


    // init form 

    initForm = document.querySelector('#init-form');
    initForm.addEventListener('submit', e => {
        e.preventDefault();

        // fetch json init
        let input_apiKey = initForm['apiKey'];
        let input_authDomain = initForm['authDomain'];
        let input_databaseURL = initForm['databaseURL'];
        let input_projectId = initForm['projectId'];
        let input_btnInit = initForm['btn-init']

        // create a firebaseConfig
        let firebaseConfig = { 
            apiKey: input_apiKey.value,
            authDomain: input_authDomain.value,
            databaseURL: input_databaseURL.value,
            projectId: input_projectId.value
        };

        // init firebase
        try {
            app = firebase.initializeApp(firebaseConfig);
        } catch (e) {
            console.log(e);
            M.toast({html: e.message});
            app.delete(app); // prevent dupliace db error 
        }
        
        // init firebase services
        firestoreService = firebase.firestore();
        authService = firebase.auth();
        functionsService = firebase.functions();

        // upadte DOM
        input_apiKey.disabled = true;
        input_authDomain.disabled = true;
        input_databaseURL.disabled = true;
        input_projectId.disabled = true;
        input_btnInit.disabled = true;

        // show gui
        elem = document.querySelector('#init-collapsible');
        let instance = M.Collapsible.getInstance(elem);
        instance.close();
        gui = document.getElementById('ui').style = "display: block";


        // register a auth event

        authService.onAuthStateChanged( user => {
            authPane = document.querySelector('#auth-pane');
            let status = document.querySelector('#auth-status');
            if (user) { 
                status.innerHTML = `logged in as ${user.email} <br /> (uid: ${user.uid})
                
                <p />
                <button onClick="authService.signOut().then( () => { M.toast( { html: 'Signed out' } ); output('Logged out');  } );" class="btn yellow darken-2 z-depth-0">Sign out</button>
                `;
                console.log('logged in ', user.email);
                output(`Logged in (${user.email})`);
                authPane.style = "display: none;";
            } else {
                status.innerHTML = `Not logged in`;
                authPane.style = "display: block;";
            }
        });
    

        
    });


    // db explorer
    opSelect = document.querySelector("#op-name");
    opSelect.addEventListener('change', e => {
        if(['set', 'update'].includes(e.target.value)) {
            // toggle<show>
            document.querySelector('#op-json').style.display = "block";
        } else {
            // toggle<hide>
            document.querySelector('#op-json').style.display = "none";
        }
    });


    // auth service

    loginForm = document.querySelector('#signin-form')
    loginForm.addEventListener('submit', e => {
        e.preventDefault();

        let email = loginForm['email'].value;
        let password = loginForm['password'].value;

        try {
            authService.signInWithEmailAndPassword(email, password).then( creds => {
                console.log(creds.user.email);
                console.log(creds.user.uid);
            }).catch(e => {
                M.toast( {html: e.message} );
                console.log(e);
                output(`<b>Error:</b> Firebase auth failed. For more info, open the browser's console.`);
            });

        } catch (e) {
            M.toast( { html: e.message } );
        }
    });


    signupForm = document.querySelector('#signup-form')
    signupForm.addEventListener('submit', e => {
        e.preventDefault();

        let email = signupForm['email'].value;
        let password = signupForm['password'].value;

        try {
            authService.createUserWithEmailAndPassword(email, password).then( creds => {
                output(`Account created (${creds.user.email})`);
                console.log(creds.user.email);
                console.log(creds.user.uid);
            }).catch(e => {
                M.toast( {html: e.message} );
            });

        } catch (e) {
            M.toast( { html: e.message } );
        }
    });


    // firestore service

    exploreForm = document.querySelector('#firestore-explorer');
    exploreForm.addEventListener('submit', e => {
        e.preventDefault();

        let collection_name = exploreForm['collection_name'].value;
        let op = exploreForm['op'].value;
        let jsonInput = exploreForm['json-input'].value;
        let docId = exploreForm['docId'].value;
        let data = '';

        if(['set', 'update'].includes(op)) {
            try {
                eval( `jsonInput = [${jsonInput}]; jsonInput = jsonInput[0];` ); // yuck. It is what it is
                console.log(jsonInput)
            } catch(e) {
                M.toast( {html: `Please enter a valid JSON object`} );
                return;
            };

            // set 
            if(op == 'set') {
                try {
                    if(docId) {
                        firestoreService.collection(collection_name).doc(docId).set(jsonInput).then( () => {
                            console.log(`Document was overwritten/created (ID: ${docId})`);
                            output(`<b>Document overwritten/created (ID: ${docId})</b> <br /><b>Result: </b> ${escapeHtml(JSON.stringify(jsonInput))}`);
                        }).catch(e => {
                            output(`<b>Error:</b> ${e.message}`);
                        });
                    } else {
                        firestoreService.collection(collection_name).add(jsonInput).then( docref => {
                            console.log("firestore response: ", docref);
                             output(`<b>Response</b>: <br /> Document added (ID: ${docref.id})`);
                         }).catch(e => {
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
            else if(op == 'update') {
                try {
                    if(docId) {
                        firestoreService.collection(collection_name).doc(docId).update(jsonInput).then( () => {
                            console.log(`Updated(Doc ID: ${docId})`);
                            output(`<b>Updated fields(Doc ID: ${docId})</b><br /> ${escapeHtml(JSON.stringify(jsonInput))}`);
                        }).catch(e => {
                            output(`<b>Error:</b> ${e.message}`);
                        });
                    } else {
                        throw { message: `Document ID field is mandatory when trying to delete/update a record`};
                    }
                } catch (e) {
                    console.log(e);
                    output(`<b>Error:</b> ${e.message}`);
                }
            } 
        } else {
            
            // get
            if(op == 'get') {
            try {
                if(docId) {
                    // get a specific document
                    firestoreService.collection(collection_name).doc(docId).get().then(snapshot => {
                        data = snapshot.data();
                        if(!data) {
                            throw { message: `Document ${docId} not found` }; 
                        } 
                        console.log("firestore response: ", data);
                        output(`<b>Getting <i>${docId}</i> from <i>${collection_name}</i> </b> <br /> <b>Response</b>: <br /> ${escapeHtml(JSON.stringify(data))}`);
                    }).catch(e => {
                        output(`Error: ${e.message}`);
                    });
                } else {
                    // get all documents inside a specific collection
                    firestoreService.collection(collection_name).get().then(snapshots => {
                        let result = '<b>Response</b>: <br />';
                        console.log("firestore response: ");
                        if(!snapshots.docs.length) {
                            throw { message: `empty response` }
                        }
                        snapshots.docs.forEach( doc => {
                            data = doc.data();
                            console.log(data);
                            result += escapeHtml(JSON.stringify(data)) + "<br />";
                         });
                         output(result);
                     }).catch(e => {
                         output(`Error: ${e.message}`);
                         console.log(e);
                     });
                }
            } catch (e) {
                console.log(e);
                output(`Error: ${e.message}`);
            }

            // delete
        } else if(op == 'delete') {
            try {
                if(docId) {
                    firestoreService.collection(collection_name).doc(docId).delete().then( () => {
                        console.log(`Deleted(Doc ID: ${docId})`);
                        output(`<b>Deleted</b>(Doc ID: ${docId})`);
                    }).catch(e => {
                        output(`Error: ${e.message}`);
                    });
                } else {
                    throw { message: `Document ID field is mandatory when trying to delete/update a record`};
                }
            } catch (e) {
                console.log(e);
                output(`Error: ${e.message}`);
            }
          }
        }
    });

    // cloud functions service

    // invoke a cloud function
    cloudfuncForm = document.querySelector('#invoke-cf-form');
    cloudfuncForm.addEventListener('submit', e => {
        e.preventDefault();

        // fetch info from dom
        let cloudCmd = cloudfuncForm['cloud-cmd'].value;
        let funcName = cloudCmd.split('(')[0];
        let funcParams = cloudCmd.split(funcName)[1];

        // validations
        let validateFunc = /^[a-zA-Z][a-zA-Z0-9]+([ ]|[a-zA-Z])\(/gm;
        if(!validateFunc.exec(cloudCmd)) {
            M.toast({html: `Please enter a valid invoke syntax`});
            return ;
        }
        
        if(funcParams[funcParams.length-1] != ')') {
            M.toast({html: `Please enter a valid invoke syntax. <br />Reason: The input is not ending with  ')'`});
            return ;
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
        } catch(e) {
            M.toast({html: "Invalid invoke syntax. For more information, open the browser's console."});
            console.log(e);
        }
        
    });

});


function output(data) {
    let time = new Date().toLocaleTimeString();
    outputLog.innerHTML = `<pre><i>${time}</i> <br /> ${data} <hr /> ${outputLog.innerHTML}</pre>`;
}

function escapeHtml(data) { // making the output less messy in case the firestore db contains entries with html tags in it
    return data           
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
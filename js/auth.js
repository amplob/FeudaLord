// =====================================================
// AUTH (Google Sign-In)
// =====================================================
// Thin layer around firebase.auth(). Anyone interested in auth state
// subscribes via onAuthChange(cb) — the callback fires immediately with
// the current user (or null) and then again on every change.
//
// When signed in we'll later mirror saveState() to a per-user Firestore
// doc; for now this file only handles the auth flow itself.
// =====================================================

let currentUser = null;
const authListeners = [];

function onAuthChange(cb) {
    authListeners.push(cb);
    cb(currentUser);
}

fbAuth.onAuthStateChanged(user => {
    currentUser = user;
    console.log("[auth] state:", user ? `signed in as ${user.email}` : "signed out");
    for (const cb of authListeners) cb(user);
});

async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await fbAuth.signInWithPopup(provider);
    } catch (e) {
        console.error("[auth] sign-in failed", e);
        alert(`Sign-in failed: ${e.message}`);
    }
}

async function signOutUser() {
    try {
        await fbAuth.signOut();
    } catch (e) {
        console.error("[auth] sign-out failed", e);
    }
}

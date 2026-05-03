// =====================================================
// CLOUD SAVE (Firestore mirror of localStorage)
// =====================================================
// Per-user save document at saves/{uid}. We stringify the entire gameState
// so Firestore is just key/value — keeps writes atomic and avoids the
// "undefined fields not allowed" / max-nesting gotchas of the structured
// representation.
//
// Operations are no-ops when the user isn't signed in. Failures log to
// console but don't block gameplay (localStorage is the operational source
// of truth; cloud is a mirror).
// =====================================================

const SAVES_COLLECTION = "saves";

async function cloudSaveState(state) {
    if (!currentUser || typeof fbDb === "undefined") return;
    try {
        await fbDb.collection(SAVES_COLLECTION).doc(currentUser.uid).set({
            state: JSON.stringify(state),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (e) {
        console.error("[cloud] save failed:", e);
    }
}

async function cloudLoadState() {
    if (!currentUser || typeof fbDb === "undefined") return null;
    try {
        const doc = await fbDb.collection(SAVES_COLLECTION).doc(currentUser.uid).get();
        if (!doc.exists) return null;
        const data = doc.data();
        if (!data || !data.state) return null;
        return JSON.parse(data.state);
    } catch (e) {
        console.error("[cloud] load failed:", e);
        return null;
    }
}

// On sign-in: pull the cloud doc. If it exists, replace localStorage with
// it (cloud wins on conflict). If it doesn't, push the current local save
// up so a brand-new account inherits whatever progress was made anonymously.
//
// Idempotent — onAuthChange fires multiple times (page load, refresh) with
// the same uid, so we guard with lastSyncedUid.
let _lastSyncedUid = null;

async function syncOnSignIn(user) {
    if (!user) {
        _lastSyncedUid = null;
        return;
    }
    if (user.uid === _lastSyncedUid) return;
    _lastSyncedUid = user.uid;

    const cloud = await cloudLoadState();
    if (cloud) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud));
        console.log("[cloud] pulled save into localStorage");
    } else {
        const localStr = localStorage.getItem(STORAGE_KEY);
        if (localStr) {
            try {
                await cloudSaveState(JSON.parse(localStr));
                console.log("[cloud] pushed initial localStorage save to cloud");
            } catch (_) { /* logged inside cloudSaveState */ }
        }
    }
}

if (typeof onAuthChange === "function") {
    onAuthChange(syncOnSignIn);
}

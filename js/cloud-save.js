// =====================================================
// CLOUD SAVE (Firestore mirror of localStorage)
// =====================================================
// Per-user save document at saves/{uid}. We stringify the entire gameState
// so Firestore is just key/value — keeps writes atomic and avoids the
// "undefined fields not allowed" / max-nesting gotchas of the structured
// representation.
//
// All operations no-op when the user isn't signed in. Failures log to
// console but don't block gameplay (localStorage is the operational source
// of truth; cloud is a mirror).
//
// Cloud writes are *debounced*: every saveState() call schedules a flush
// CLOUD_DEBOUNCE_MS later, and the timer resets on each new save so a
// burst of saves only produces one cloud write at the end. We also flush
// eagerly when the tab is hidden (visibilitychange), so a closed-then-
// reopened-on-another-device player doesn't lose recent progress.
// Result: typical session = ~1-3 cloud writes (vs one per save).
// =====================================================

const SAVES_COLLECTION = "saves";
const CLOUD_DEBOUNCE_MS = 30000;

let _cloudTimer = null;
let _cloudPending = false;

// Push localStorage → Firestore. Reads localStorage at flush time so we
// always send the freshest snapshot, regardless of when the flush was
// scheduled.
async function flushCloudSave() {
    if (_cloudTimer) { clearTimeout(_cloudTimer); _cloudTimer = null; }
    if (!_cloudPending) return;
    _cloudPending = false;
    if (typeof currentUser === "undefined" || !currentUser) return;
    if (typeof fbDb === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
        await fbDb.collection(SAVES_COLLECTION).doc(currentUser.uid).set({
            state: stored,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (e) {
        console.error("[cloud] save failed:", e);
    }
}

// Schedule a deferred cloud sync. Called from saveState() in game.js.
// Multiple calls within CLOUD_DEBOUNCE_MS coalesce into a single write.
function cloudSaveState(/* state */) {
    // If no one's signed in, skip the bookkeeping — nothing to sync.
    if (typeof currentUser === "undefined" || !currentUser) return;
    _cloudPending = true;
    if (_cloudTimer) clearTimeout(_cloudTimer);
    _cloudTimer = setTimeout(flushCloudSave, CLOUD_DEBOUNCE_MS);
}

// Force-flush when the tab loses visibility or unloads. visibilitychange is
// the most reliable signal on mobile (browsers can kill backgrounded tabs
// without firing beforeunload); pagehide covers same-tab navigation.
if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && _cloudPending) flushCloudSave();
    });
    window.addEventListener("pagehide", () => {
        if (_cloudPending) flushCloudSave();
    });
}

async function cloudLoadState() {
    if (typeof currentUser === "undefined" || !currentUser) return null;
    if (typeof fbDb === "undefined") return null;
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
            cloudSaveState();
            // Force the first sync immediately so a fresh account shows up
            // in Firestore without waiting CLOUD_DEBOUNCE_MS.
            flushCloudSave();
            console.log("[cloud] pushed initial localStorage save to cloud");
        }
    }
}

if (typeof onAuthChange === "function") {
    onAuthChange(syncOnSignIn);
}

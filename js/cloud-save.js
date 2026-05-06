// =====================================================
// CLOUD SAVE (Firestore mirror of localStorage)
// =====================================================
// Per-user document at saves/{uid}, structured as a map of kingdom slots:
//   {
//     states:    { greenvale: "<json>", rivermark: "<json>", ... }
//     saveSeqs:  { greenvale: 5, rivermark: 12, ... }
//     updatedAt: <serverTimestamp>
//   }
//
// Per-kingdom saveSeq lets sync resolve which side is newer for each
// slot independently — switching kingdoms or playing across devices
// just merges the slot maps. Writes use merge:true and only update the
// kingdoms marked dirty since the last flush, so a single spin in
// Greenvale doesn't re-upload the Stonehold save.
//
// Operations are no-ops when the user isn't signed in. Failures log to
// console but don't block gameplay (localStorage is the source of truth).
//
// Web policy: every cloudSaveState() flushes immediately (no debounce),
// and every visibilitychange→shown re-pulls from the cloud. This makes
// cross-device debugging match the natural mental model: spin on phone,
// open desktop tab, see the new state.
// Native policy: still no debounce, integrity-event flushes only.
// =====================================================

const SAVES_COLLECTION = "saves";

let _cloudFlushInFlight = false;
const _dirtyKingdoms = new Set();

// Push the dirty kingdoms' localStorage slots → Firestore. Reads localStorage
// at flush time so we always send the freshest snapshot. Uses set with merge
// so untouched kingdom slots stay intact.
async function flushCloudSave() {
    if (_dirtyKingdoms.size === 0) return;
    if (typeof currentUser === "undefined" || !currentUser) return;
    if (typeof fbDb === "undefined") return;
    if (_cloudFlushInFlight) return; // a flush is already running; it'll pick up new dirty entries on its next tick if we re-call after it resolves
    _cloudFlushInFlight = true;

    const updates = {};
    const batch = Array.from(_dirtyKingdoms);
    for (const kingdomId of batch) {
        const stored = localStorage.getItem(storageKeyFor(kingdomId));
        if (!stored) continue;
        let saveSeq = 0;
        try { saveSeq = JSON.parse(stored).saveSeq || 0; } catch (_) {}
        updates[`states.${kingdomId}`] = stored;
        updates[`saveSeqs.${kingdomId}`] = saveSeq;
    }
    updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    try {
        await fbDb.collection(SAVES_COLLECTION).doc(currentUser.uid).set(updates, { merge: true });
        // Only clear the entries we actually flushed; any new dirty entries
        // queued during the await are kept for the next call.
        for (const kid of batch) _dirtyKingdoms.delete(kid);
    } catch (e) {
        console.error("[cloud] save failed:", e);
    } finally {
        _cloudFlushInFlight = false;
    }
}

// Mark the active kingdom dirty and flush immediately (web) or wait for an
// integrity-event flush (native). Per-turn read/write makes cross-device
// debugging straightforward.
function cloudSaveState(/* state */) {
    if (typeof currentUser === "undefined" || !currentUser) return;
    if (!gameState || !gameState.kingdomId) return;
    _dirtyKingdoms.add(gameState.kingdomId);

    // On native, skip eager flushes — integrity events (visibility-hide,
    // sign-in/out, game-over, kingdom switch) carry the writes.
    if (typeof IS_NATIVE !== "undefined" && IS_NATIVE) return;

    flushCloudSave();
}

// Delete a single kingdom slot from the cloud doc. Used by the per-kingdom
// reset on the kingdom selection screen.
async function cloudDeleteKingdom(kingdomId) {
    if (typeof currentUser === "undefined" || !currentUser) return;
    if (typeof fbDb === "undefined") return;
    try {
        await fbDb.collection(SAVES_COLLECTION).doc(currentUser.uid).update({
            [`states.${kingdomId}`]: firebase.firestore.FieldValue.delete(),
            [`saveSeqs.${kingdomId}`]: firebase.firestore.FieldValue.delete(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (e) {
        console.error("[cloud] kingdom delete failed:", e);
    }
}

// =====================================================
// PULL FROM CLOUD
// =====================================================
// pullCloudState(uid) reads the cloud doc and overwrites localStorage for
// any kingdom whose cloud saveSeq is strictly newer than local. Returns
// true when at least one slot was overwritten — callers may want to reload
// the page so the in-memory state matches the new localStorage.

async function pullCloudState(uid) {
    if (typeof fbDb === "undefined") return false;

    let cloudDoc;
    try {
        cloudDoc = await fbDb.collection(SAVES_COLLECTION).doc(uid).get();
    } catch (e) {
        console.error("[cloud] pull failed:", e);
        return false;
    }

    let cloudData = cloudDoc.exists ? cloudDoc.data() : null;

    // Legacy single-slot doc: { state, saveSeq } → upgrade in place.
    if (cloudData && cloudData.state && !cloudData.states) {
        try {
            const parsed = JSON.parse(cloudData.state);
            const kid = parsed.kingdomId || (typeof DEFAULT_KINGDOM_ID !== "undefined"
                ? DEFAULT_KINGDOM_ID : null);
            if (kid) {
                cloudData = {
                    states: { [kid]: cloudData.state },
                    saveSeqs: { [kid]: cloudData.saveSeq || 0 },
                };
            }
        } catch (_) {}
    }

    const cloudStates = (cloudData && cloudData.states) || {};
    const cloudSeqs   = (cloudData && cloudData.saveSeqs) || {};

    const allKingdomIds = new Set([
        ...Object.keys(cloudStates),
        ...((typeof KINGDOMS !== "undefined") ? KINGDOMS.map(k => k.id) : []),
    ]);

    let pulled = false;
    for (const kid of allKingdomIds) {
        const localStr = localStorage.getItem(storageKeyFor(kid));
        let localSeq = -1;
        if (localStr) {
            try { localSeq = JSON.parse(localStr).saveSeq || 0; } catch (_) {}
        }
        const cloudSeq = cloudStates[kid] ? (cloudSeqs[kid] || 0) : -1;

        if (cloudSeq > localSeq) {
            localStorage.setItem(storageKeyFor(kid), cloudStates[kid]);
            console.log(`[cloud] pulled ${kid} (cloudSeq=${cloudSeq} > localSeq=${localSeq})`);
            pulled = true;
        } else if (localSeq > cloudSeq) {
            _dirtyKingdoms.add(kid);
            console.log(`[cloud] queued ${kid} push (localSeq=${localSeq} > cloudSeq=${cloudSeq})`);
        }
    }
    return pulled;
}

// Force-flush when the tab loses visibility or unloads, and pull when the
// tab becomes visible again — that's how a different-device update reaches
// this tab without a manual refresh.
if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", async () => {
        if (document.hidden) {
            if (_dirtyKingdoms.size > 0) flushCloudSave();
            return;
        }
        if (typeof currentUser !== "undefined" && currentUser) {
            const changed = await pullCloudState(currentUser.uid);
            // Reload so in-memory gameState matches the freshly-pulled local
            // storage. Only fires when the cloud actually had something newer.
            if (changed) location.reload();
            else if (_dirtyKingdoms.size > 0) flushCloudSave();
        }
    });
    window.addEventListener("pagehide", () => {
        if (_dirtyKingdoms.size > 0) flushCloudSave();
    });
}

// On sign-in, reconcile each kingdom slot independently:
//   cloud.saveSeqs[k] > local.saveSeq   → pull cloud into local
//   local.saveSeq    > cloud.saveSeqs[k] → mark local dirty (push on flush)
let _lastSyncedUid = null;

async function syncOnSignIn(user) {
    if (!user) {
        _lastSyncedUid = null;
        return;
    }
    if (user.uid === _lastSyncedUid) return;
    _lastSyncedUid = user.uid;

    await pullCloudState(user.uid);
    if (_dirtyKingdoms.size > 0) {
        await flushCloudSave();
    }
}

if (typeof onAuthChange === "function") {
    onAuthChange(syncOnSignIn);
}

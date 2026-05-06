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
// Cloud writes are *debounced*: every saveState() call schedules a flush
// CLOUD_DEBOUNCE_MS later, and the timer resets on each new save so a
// burst of saves only produces one cloud write at the end. We also flush
// eagerly when the tab is hidden (visibilitychange / pagehide).
// =====================================================

const SAVES_COLLECTION = "saves";
const CLOUD_DEBOUNCE_MS = 30000;

let _cloudTimer = null;
const _dirtyKingdoms = new Set();

// Push the dirty kingdoms' localStorage slots → Firestore. Reads localStorage
// at flush time so we always send the freshest snapshot. Uses set with merge
// so untouched kingdom slots stay intact.
async function flushCloudSave() {
    if (_cloudTimer) { clearTimeout(_cloudTimer); _cloudTimer = null; }
    if (_dirtyKingdoms.size === 0) return;
    if (typeof currentUser === "undefined" || !currentUser) return;
    if (typeof fbDb === "undefined") return;

    const updates = {};
    for (const kingdomId of _dirtyKingdoms) {
        const stored = localStorage.getItem(storageKeyFor(kingdomId));
        if (!stored) continue;
        let saveSeq = 0;
        try { saveSeq = JSON.parse(stored).saveSeq || 0; } catch (_) {}
        updates[`states.${kingdomId}`] = stored;
        updates[`saveSeqs.${kingdomId}`] = saveSeq;
    }
    updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    _dirtyKingdoms.clear();

    try {
        await fbDb.collection(SAVES_COLLECTION).doc(currentUser.uid).set(updates, { merge: true });
    } catch (e) {
        console.error("[cloud] save failed:", e);
    }
}

// Mark the active kingdom dirty and (on web) schedule a debounced flush.
// Per-platform strategy:
//   web-desktop / web-mobile : debounce CLOUD_DEBOUNCE_MS, plus an eager
//       flush on visibilitychange / pagehide. Browser localStorage can be
//       evicted, so a regular trickle to the cloud is the backup.
//   capacitor-android        : no debounce. Local storage on native sits
//       behind SharedPreferences and only clears on uninstall, so the
//       cloud is just for cross-device. Flushes only fire at integrity
//       events (visibility-hide, sign-in/out, game-over, kingdom switch).
function cloudSaveState(/* state */) {
    if (typeof currentUser === "undefined" || !currentUser) return;
    if (!gameState || !gameState.kingdomId) return;
    _dirtyKingdoms.add(gameState.kingdomId);

    // On native, skip the debounce timer — integrity-event flushes carry it.
    if (typeof IS_NATIVE !== "undefined" && IS_NATIVE) return;

    if (_cloudTimer) clearTimeout(_cloudTimer);
    _cloudTimer = setTimeout(flushCloudSave, CLOUD_DEBOUNCE_MS);
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

// Force-flush when the tab loses visibility or unloads. visibilitychange is
// the most reliable signal on mobile (browsers can kill backgrounded tabs
// without firing beforeunload); pagehide covers same-tab navigation.
if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && _dirtyKingdoms.size > 0) flushCloudSave();
    });
    window.addEventListener("pagehide", () => {
        if (_dirtyKingdoms.size > 0) flushCloudSave();
    });
}

// On sign-in, reconcile each kingdom slot independently:
//   cloud.saveSeqs[k] > local.saveSeq   → pull cloud into local
//   local.saveSeq    > cloud.saveSeqs[k] → mark local dirty (push on flush)
// Migrates legacy single-state docs (`{state, saveSeq}`) into the new map.
let _lastSyncedUid = null;

async function syncOnSignIn(user) {
    if (!user) {
        _lastSyncedUid = null;
        return;
    }
    if (user.uid === _lastSyncedUid) return;
    _lastSyncedUid = user.uid;

    if (typeof fbDb === "undefined") return;

    let cloudDoc;
    try {
        cloudDoc = await fbDb.collection(SAVES_COLLECTION).doc(user.uid).get();
    } catch (e) {
        console.error("[cloud] sync read failed:", e);
        return;
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
        } else if (localSeq > cloudSeq) {
            _dirtyKingdoms.add(kid);
            console.log(`[cloud] queued ${kid} push (localSeq=${localSeq} > cloudSeq=${cloudSeq})`);
        }
    }

    if (_dirtyKingdoms.size > 0) {
        await flushCloudSave();
    }
}

if (typeof onAuthChange === "function") {
    onAuthChange(syncOnSignIn);
}

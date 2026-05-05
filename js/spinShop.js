// =====================================================
// SPIN SHOP
// =====================================================
// Two ways to top up the spin stamina pool:
//   - Watch a (placeholder) ad → refill back to maxSpins.
//   - "Pssst… buy me a coffee" → opens an external platform; on return
//     the player is granted unlimitedSpins (a flag on gameState).
//
// The web build has no real ads / no real billing — those wire up in the
// Android port (admob-plus, Play Billing). For now the ad button simulates
// a 2s "ad watching" state then grants the reward; the coffee button just
// opens COFFEE_URL and trusts the click as proof of purchase.

// Real product link goes here once the platform is set up. Until then it
// opens a generic Buy Me A Coffee landing — Marc will swap it.
const COFFEE_URL = "https://buymeacoffee.com/";

// Make the ad simulation feel like a real interstitial without actually
// loading anything. Two seconds is short enough to test fast, long enough
// to read the toast.
const AD_SIMULATED_MS = 2000;

let _adInProgress = false;

function openSpinShop() {
    refreshSpinShop();
    document.getElementById("spinShopOverlay")?.classList.remove("hidden");
}

function closeSpinShop() {
    document.getElementById("spinShopOverlay")?.classList.add("hidden");
}

// Refresh the live status line (spins / regen / unlimited badge). Called
// when opening, after a reward, and on each spin tick while open.
function refreshSpinShop() {
    if (!gameState) return;
    const overlay = document.getElementById("spinShopOverlay");
    if (!overlay || overlay.classList.contains("hidden")) return;

    const countEl = document.getElementById("spinShopCount");
    const regenEl = document.getElementById("spinShopRegen");
    const noteEl  = document.getElementById("spinShopUnlimitedNote");
    const adBtn   = document.getElementById("watchAdButton");
    const spyBtn  = document.getElementById("spyDealButton");

    if (gameState.unlimitedSpins) {
        if (countEl) countEl.textContent = "∞";
        if (regenEl) regenEl.textContent = "Unlimited spins, friend.";
        if (noteEl)  noteEl.hidden = false;
        if (adBtn)   adBtn.disabled = true;
        if (spyBtn)  spyBtn.disabled = true;
        return;
    }

    if (noteEl) noteEl.hidden = true;
    if (spyBtn) spyBtn.disabled = false;

    const cur = gameState.spins;
    const max = gameState.maxSpins;
    if (countEl) countEl.textContent = `${cur} / ${max}`;

    if (cur >= max) {
        if (regenEl) regenEl.textContent = "Pool is full.";
        if (adBtn)   adBtn.disabled = true;
    } else {
        const ms = (typeof spinsRegenInMs === "function" ? spinsRegenInMs() : null) ?? 0;
        const total = Math.ceil(ms / 1000);
        const mm = String(Math.floor(total / 60)).padStart(2, "0");
        const ss = String(total % 60).padStart(2, "0");
        if (regenEl) regenEl.textContent = `+1 in ${mm}:${ss}`;
        if (adBtn)   adBtn.disabled = _adInProgress;
    }
}

function handleWatchAd() {
    if (_adInProgress) return;
    if (!gameState) return;
    if (gameState.unlimitedSpins) return;
    if (gameState.spins >= gameState.maxSpins) {
        showToast("Pool is already full.");
        return;
    }

    _adInProgress = true;
    const adBtn = document.getElementById("watchAdButton");
    if (adBtn) adBtn.disabled = true;
    showToast("🎬 Watching ad…");

    setTimeout(() => {
        _adInProgress = false;
        gameState.spins = gameState.maxSpins;
        gameState.lastSpinAt = Date.now();
        if (typeof renderSpinStatus === "function") renderSpinStatus();
        refreshSpinShop();
        if (typeof saveState === "function") saveState();
        showToast(`⚡ +${gameState.maxSpins} spins. Your pool is full.`);
    }, AD_SIMULATED_MS);
}

function handleSpyDeal() {
    if (!gameState) return;
    if (gameState.unlimitedSpins) {
        showToast("🕵️ The deal is already done, friend.");
        return;
    }

    // Open the platform in a new tab. Assume completion on return — fine
    // for the prototype; production should verify via Play Billing /
    // Stripe webhook.
    try {
        window.open(COFFEE_URL, "_blank", "noopener,noreferrer");
    } catch (_) { /* popup blocked — still grant locally for prototype */ }

    grantUnlimitedSpins();
}

function grantUnlimitedSpins() {
    if (!gameState) return;
    gameState.unlimitedSpins = true;
    gameState.spins = gameState.maxSpins;
    if (typeof renderSpinStatus === "function") renderSpinStatus();
    refreshSpinShop();
    if (typeof saveState === "function") saveState();
    showToast("🕵️ The deal is sealed. Spin away — forever.");
}

function wireSpinShop() {
    const closeBtn = document.getElementById("spinShopClose");
    const overlay  = document.getElementById("spinShopOverlay");
    const adBtn    = document.getElementById("watchAdButton");
    const spyBtn   = document.getElementById("spyDealButton");
    const status   = document.getElementById("spinStatus");

    if (closeBtn) closeBtn.addEventListener("click", closeSpinShop);
    if (overlay) overlay.addEventListener("click", (e) => {
        if (e.target.id === "spinShopOverlay") closeSpinShop();
    });
    if (adBtn) adBtn.addEventListener("click", handleWatchAd);
    if (spyBtn) spyBtn.addEventListener("click", handleSpyDeal);
    if (status) status.addEventListener("click", openSpinShop);
}

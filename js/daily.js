// =====================================================
// DAILY LOGIN BONUS
// =====================================================
// Once every DAILY_COOLDOWN_MS the player can tap the gift button on the wheel
// page to receive a small resource boost in their active kingdom. Reward is
// chosen uniformly from DAILY_REWARDS and applied via applyResourceChange so
// it shows a floating delta and ticks the stats.
//
// Timer state is global (not per-kingdom) — one bonus per real day regardless
// of which kingdom is being played. State persists in its own localStorage
// slot so it survives Reset Game.

const DAILY_KEY = "feudal-lord-daily";
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Values in gold-equivalent are roughly balanced (~8g each) to keep the boost
// noticeable but not disruptive (a typical decision is 5–10g).
const DAILY_REWARDS = [
    { resource: "gold",     amount: 8,  icon: "💰",
      message: "Consistency pays in gold." },
    { resource: "food",     amount: 16, icon: "🌾",
      message: "Give a man a fish and he will have a fish." },
    { resource: "manpower", amount: 3,  icon: "👥",
      message: "It's dangerous to go alone — take this." },
    { resource: "favor",    amount: 4,  icon: "👑",
      message: "Fortune favours the brave — is it you?" },
];

function _loadDaily() {
    try {
        const raw = localStorage.getItem(DAILY_KEY);
        return raw ? JSON.parse(raw) : { nextAvailableAt: 0 };
    } catch (_) {
        return { nextAvailableAt: 0 };
    }
}

function _saveDaily(state) {
    try { localStorage.setItem(DAILY_KEY, JSON.stringify(state)); } catch (_) {}
}

let _dailyState = null;
function _daily() {
    if (!_dailyState) _dailyState = _loadDaily();
    return _dailyState;
}

function dailyAvailable() {
    return Date.now() >= _daily().nextAvailableAt;
}

function dailyMsRemaining() {
    return Math.max(0, _daily().nextAvailableAt - Date.now());
}

// Test helper: schedule the next claim N seconds from now (set 0 to make it
// available immediately). Wired from the test picker as "Daily login in 15s".
function scheduleDailyIn(seconds) {
    const state = _daily();
    state.nextAvailableAt = Date.now() + Math.max(0, seconds * 1000);
    _saveDaily(state);
    renderDailyButton();
}

// =====================================================
// CLAIM FLOW
// =====================================================

function claimDailyBonus() {
    if (!dailyAvailable()) return null;
    if (typeof gameState === "undefined" || !gameState) return null;

    const reward = DAILY_REWARDS[Math.floor(Math.random() * DAILY_REWARDS.length)];
    applyResourceChange({ [reward.resource]: reward.amount }, null);

    const state = _daily();
    state.nextAvailableAt = Date.now() + DAILY_COOLDOWN_MS;
    _saveDaily(state);

    return reward;
}

function handleDailyClick() {
    if (!dailyAvailable()) {
        // Tapping the dim icon while it's still cooling down — do nothing.
        return;
    }
    const reward = claimDailyBonus();
    if (reward) {
        showDailyOverlay(reward);
    }
    renderDailyButton();
    if (typeof saveState === "function") saveState();
}

// =====================================================
// MODAL
// =====================================================

function showDailyOverlay(reward) {
    const overlay = document.getElementById("dailyOverlay");
    const msg = document.getElementById("dailyMessage");
    const rew = document.getElementById("dailyReward");
    if (!overlay) return;
    if (msg) msg.textContent = reward.message;
    if (rew) rew.innerHTML = `+${reward.amount} <span class="daily-reward-icon">${reward.icon}</span>`;
    overlay.classList.remove("hidden");
}

function hideDailyOverlay() {
    const overlay = document.getElementById("dailyOverlay");
    if (overlay) overlay.classList.add("hidden");
}

// =====================================================
// BUTTON STATE / COUNTDOWN TICK
// =====================================================

function _formatDailyCountdown(ms) {
    const totalSec = Math.ceil(ms / 1000);
    if (totalSec <= 0) return "";
    if (totalSec >= 3600) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function renderDailyButton() {
    const btn = document.getElementById("dailyButton");
    if (!btn) return;
    const ready = dailyAvailable();
    btn.classList.toggle("ready", ready);
    btn.classList.toggle("dim", !ready);
    btn.setAttribute("aria-label", ready ? "Claim daily blessing" : "Daily blessing not yet ready");

    const countdown = btn.querySelector(".daily-countdown");
    if (countdown) {
        countdown.textContent = ready ? "" : _formatDailyCountdown(dailyMsRemaining());
    }
}

let _dailyTick = null;
function startDailyTick() {
    renderDailyButton();
    if (_dailyTick) return;
    _dailyTick = setInterval(renderDailyButton, 1000);
}

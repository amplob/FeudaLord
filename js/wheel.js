// =====================================================
// WHEEL OF AUGURIES - CONFIGURATION
// =====================================================
// Single source of truth for wheel segments.
// The CSS gradient is generated from this config.
// To modify the wheel, just edit this array!
// =====================================================

// 8 equal-sized slices (45° each). Each slice has a TYPE (what category of
// card it draws) and a TONALITY (good/neutral/bad), which influences:
//   - Which cards are eligible (events are filtered by tonality).
//   - A sliceMultiplier that amplifies the resulting numbers (bigger payouts
//     on good slices, harsher terms on bad slices). Decisions multiply their
//     qualityFactor; events scale eventBase and ongoing effects (sign preserved).
// Layout counts: 3 decisions (1 good, 1 neutral, 1 bad), 2 events (1 good,
// 1 bad), 2 investments (neutral), 1 trade (neutral). Probabilities: decision
// 37.5%, event 25%, investment 25%, trade 12.5%. Interleaved so two slices of
// the same type never sit adjacent.
// Icons come from CATEGORY_ICON (cardSystem.js) so the wheel and the card
// titles stay consistent. Labels are display-only text (no emoji here).
const wheelConfig = [
    { type: "decision",   tonality: "neutral", multiplier: 1.0, label: "Decision",  color: "#b8860b" },
    { type: "investment", tonality: "neutral", multiplier: 1.0, label: "Invest",    color: "#7a6a55" },
    { type: "decision",   tonality: "good",    multiplier: 1.3, label: "Fortune",   color: "#4a9b3e" },
    { type: "event",      tonality: "bad",     multiplier: 1.2, label: "Ill Omen",  color: "#8b1a1a" },
    { type: "investment", tonality: "neutral", multiplier: 1.0, label: "Invest",    color: "#7a6a55" },
    { type: "trade",      tonality: "neutral", multiplier: 1.0, label: "Merchant",  color: "#3b5998" },
    { type: "decision",   tonality: "bad",     multiplier: 0.7, label: "Curse",     color: "#5c0f0f" },
    { type: "event",      tonality: "good",    multiplier: 1.2, label: "Good Omen", color: "#6ba850" },
];

// =====================================================
// CALCULATED SEGMENTS (from config)
// =====================================================
// Segments are equal-sized slices of 360°/N.
// In CSS conic-gradient, 0° is at 12 o'clock (top).

let wheelSegments = [];

function calculateSegments() {
    wheelSegments = [];
    const angleDegrees = 360 / wheelConfig.length;
    let currentAngle = 0;

    for (const config of wheelConfig) {
        wheelSegments.push({
            type: config.type,
            tonality: config.tonality,
            multiplier: config.multiplier,
            label: config.label,
            icon: CATEGORY_ICON[config.type],
            color: config.color,
            startAngle: currentAngle,
            endAngle: currentAngle + angleDegrees
        });
        currentAngle += angleDegrees;
    }

    console.log("Wheel segments calculated:", wheelSegments);
}

// =====================================================
// GENERATE CSS GRADIENT
// =====================================================

function generateWheelGradient() {
    const gradientParts = wheelSegments.map(segment => 
        `${segment.color} ${segment.startAngle}deg ${segment.endAngle}deg`
    );
    return `conic-gradient(${gradientParts.join(", ")})`;
}

function applyWheelStyle() {
    const wheel = document.getElementById("wheel");
    if (!wheel) return;

    wheel.style.background = generateWheelGradient();
    renderWheelIcons(wheel);
    renderWheelPegs(wheel);
    console.log("Wheel gradient applied:", generateWheelGradient());
}

// Place an emoji icon at the visual center of each segment.
// Icons are appended to the wheel so they rotate with it.
function renderWheelIcons(wheel) {
    wheel.querySelectorAll(".wheel-icon").forEach(el => el.remove());

    // Icon center sits at 66% of the wheel radius (33% of wheel width from center).
    const radiusPct = 33;

    for (const segment of wheelSegments) {
        if (!segment.icon) continue;
        const centerDeg = (segment.startAngle + segment.endAngle) / 2;
        const rad = (centerDeg * Math.PI) / 180;
        const x = radiusPct * Math.sin(rad);
        const y = -radiusPct * Math.cos(rad);

        const icon = document.createElement("span");
        icon.className = "wheel-icon";
        icon.textContent = segment.icon;
        icon.style.left = `calc(50% + ${x}%)`;
        icon.style.top = `calc(50% + ${y}%)`;
        wheel.appendChild(icon);
    }
}

// Place a small peg at every slice boundary on the rim. Pegs are children of
// #wheel so they rotate with it; the spin loop tracks when each peg crosses
// the pointer at screen-angle 0 and applies a kick + bounce-back when needed.
function renderWheelPegs(wheel) {
    wheel.querySelectorAll(".wheel-peg").forEach(el => el.remove());
    const radiusPct = 50; // exactly on the rim
    const N = wheelConfig.length;
    for (let k = 0; k < N; k++) {
        const angleDeg = (k * 360) / N;
        const rad = (angleDeg * Math.PI) / 180;
        const x = radiusPct * Math.sin(rad);
        const y = -radiusPct * Math.cos(rad);

        const peg = document.createElement("span");
        peg.className = "wheel-peg";
        peg.style.left = `calc(50% + ${x}%)`;
        peg.style.top = `calc(50% + ${y}%)`;
        // Re-center the peg on its position and orient its long axis radially.
        peg.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
        wheel.appendChild(peg);
    }
}

// =====================================================
// WHEEL SPINNING LOGIC (peg/pointer physics)
// =====================================================
// State:
//   currentRotation     — cumulative wheel angle in degrees (increases over time)
//   wheelVelocity       — angular velocity in deg/sec (positive = forward spin)
//   isSpinning          — guard against re-entrant spins
//
// Physics model:
//   Each frame integrates (angle += velocity * dt) under constant FRICTION.
//   Pegs sit at the boundaries between slices (every 360/N degrees in wheel-
//   local coordinates), so a peg crosses the pointer whenever the cumulative
//   rotation passes through a multiple of `pegSpacing`.
//
//   On a forward crossing:
//     - if pre-impact velocity ≥ PASS_THRESHOLD, lose PEG_KICK and continue.
//     - else the peg blocks: stop just before the boundary and reverse with a
//       small bounce velocity (drops the wheel back into the previous slice).
//
//   On a backward crossing (during bounce-back), the same kick applies; if the
//   bounce energy isn't enough to clear the peg behind, the wheel settles in
//   the slice it bounced into.

let currentRotation = 0;
let wheelVelocity = 0;
let isSpinning = false;
let _spinCallback = null;
let _lastFrameTime = 0;

// Tuned for a 240px wheel with 8 slices. INITIAL_VELOCITY_* gives a 4–6s spin
// with a couple of dozen peg ticks; PASS_THRESHOLD picks the moment when the
// pointer can start to "block" instead of click through.
const FRICTION = 320;            // deg/s² constant deceleration
const PEG_KICK = 11;             // deg/s lost per peg crossing
const PASS_THRESHOLD = 35;       // deg/s — below this on impact, peg blocks
const BOUNCE_REVERSE = 0.45;     // fraction of incoming velocity reversed
const MIN_BOUNCE_VEL = 70;       // floor on bounce velocity (keeps it visible)
const INITIAL_VELOCITY_MIN = 1500;
const INITIAL_VELOCITY_MAX = 2300;

function pegSpacingDeg() {
    return 360 / wheelConfig.length;
}

/**
 * Spin the wheel. Calls `callback(segment)` once the wheel comes to rest.
 * No-op if a spin is already in progress.
 */
function spinWheel(callback) {
    if (isSpinning) return;
    isSpinning = true;
    _spinCallback = callback || null;

    wheelVelocity = INITIAL_VELOCITY_MIN +
        Math.random() * (INITIAL_VELOCITY_MAX - INITIAL_VELOCITY_MIN);

    _lastFrameTime = performance.now();
    requestAnimationFrame(_spinFrame);
}

function _spinFrame(now) {
    // Cap dt so a stalled tab doesn't teleport the wheel through every peg,
    // AND clamp at zero: rAF's `now` can be a few ms earlier than the
    // performance.now() captured by spinWheel(), which would make dt negative
    // on the first frame, push the wheel backward into a peg, and snap-settle
    // before any visible motion. (Bug repro'd as flaky "no animation" spins.)
    const elapsed = Math.max(0, now - _lastFrameTime);
    const dt = Math.min(elapsed / 1000, 0.05);
    _lastFrameTime = now;

    // Apply friction toward 0.
    if (wheelVelocity > 0) {
        wheelVelocity = Math.max(0, wheelVelocity - FRICTION * dt);
    } else if (wheelVelocity < 0) {
        wheelVelocity = Math.min(0, wheelVelocity + FRICTION * dt);
    }

    if (wheelVelocity === 0) {
        _settleSpin();
        return;
    }

    const proposed = currentRotation + wheelVelocity * dt;
    const spacing = pegSpacingDeg();
    const oldBucket = Math.floor(currentRotation / spacing);
    const newBucket = Math.floor(proposed / spacing);

    if (newBucket === oldBucket) {
        currentRotation = proposed;
    } else if (newBucket > oldBucket) {
        // Forward crossings.
        let v = wheelVelocity;
        let blockedAt = null;
        for (let b = oldBucket + 1; b <= newBucket; b++) {
            if (v < PASS_THRESHOLD) {
                blockedAt = b;
                break;
            }
            v -= PEG_KICK;
        }
        if (blockedAt !== null) {
            // The peg at boundary `blockedAt * spacing` rejects the wheel.
            // Park just below it (in the slice we were leaving) and bounce.
            currentRotation = blockedAt * spacing - 0.0001;
            const bounceMagnitude = Math.max(MIN_BOUNCE_VEL, Math.abs(v) * BOUNCE_REVERSE + MIN_BOUNCE_VEL);
            wheelVelocity = -bounceMagnitude;
            _strikePointer();
        } else {
            currentRotation = proposed;
            wheelVelocity = Math.max(0, v);
            _strikePointer();
        }
    } else {
        // Backward crossings (bounce-back already underway).
        let v = -wheelVelocity;
        let blockedAt = null;
        for (let b = oldBucket; b > newBucket; b--) {
            if (v < PASS_THRESHOLD) {
                blockedAt = b;
                break;
            }
            v -= PEG_KICK;
        }
        if (blockedAt !== null) {
            // Can't make it back across this peg either — settle here.
            currentRotation = blockedAt * spacing + 0.0001;
            wheelVelocity = 0;
            _strikePointer();
            _settleSpin();
            return;
        }
        currentRotation = proposed;
        wheelVelocity = -Math.max(0, v);
        _strikePointer();
    }

    _applyWheelTransform();
    requestAnimationFrame(_spinFrame);
}

function _applyWheelTransform() {
    const wheel = document.getElementById("wheel");
    if (wheel) wheel.style.transform = `rotate(${currentRotation}deg)`;
}

function _strikePointer() {
    const p = document.getElementById("wheelPointer");
    if (p) {
        p.classList.remove("struck");
        // Force a reflow so the animation can replay back-to-back.
        void p.offsetWidth;
        p.classList.add("struck");
    }
    _playPegTick();
}

// =====================================================
// PEG TICK SOUND
// =====================================================
// Synthesised inline so we don't ship audio assets. Each peg crossing fires a
// short, soft, slightly-jittered triangle-wave click. Skipped when the menu's
// sound toggle is muted (localStorage key set by wireMenu in game.js).

const SOUND_PREF_KEY = "feudal-lord-menu-sound";
let _audioCtx = null;

function _isSoundMuted() {
    try {
        return localStorage.getItem(SOUND_PREF_KEY) === "1";
    } catch (_) {
        return false;
    }
}

function _ensureAudioCtx() {
    if (_audioCtx) return _audioCtx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
        _audioCtx = new Ctor();
    } catch (_) {
        _audioCtx = null;
    }
    return _audioCtx;
}

function _playPegTick() {
    if (_isSoundMuted()) return;
    const ctx = _ensureAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    // Pitch jitter so successive ticks don't sound mechanical.
    osc.frequency.value = 1100 + Math.random() * 400;
    // Tiny attack, ~60ms exponential decay → soft "tap".
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
}

function _settleSpin() {
    isSpinning = false;
    _applyWheelTransform();
    const segment = calculateSegmentFromRotation(currentRotation);
    console.log(`Spin settled: rotation=${currentRotation.toFixed(1)}° | pointer=${getPointerAngle(currentRotation).toFixed(1)}° | ${segment.type}/${segment.tonality} ×${segment.multiplier}`);
    const cb = _spinCallback;
    _spinCallback = null;
    if (cb) cb(segment);
}

/**
 * Get the gradient angle that's under the pointer after rotation.
 * 
 * In CSS conic-gradient:
 * - 0° is at 12 o'clock (TOP) - this is where our pointer is!
 * - Angles increase clockwise
 * 
 * When we rotate the wheel by R degrees (clockwise):
 * - The gradient rotates with it
 * - The angle that ends up under the pointer (at 0°) is: -R (mod 360)
 */
function getPointerAngle(rotation) {
    // Normalize rotation to 0-360
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    
    // The gradient angle under the pointer
    // When wheel rotates R° clockwise, the gradient point that was at -R° 
    // is now at 0° (under the pointer)
    const pointerAngle = ((360 - normalizedRotation) % 360);
    
    return pointerAngle;
}

/**
 * Determine which segment the pointer is pointing at. Returns the full
 * segment object (type, tonality, multiplier, label, color, angles).
 */
function calculateSegmentFromRotation(rotation) {
    const pointerAngle = getPointerAngle(rotation);

    for (const segment of wheelSegments) {
        if (pointerAngle >= segment.startAngle && pointerAngle < segment.endAngle) {
            return segment;
        }
    }

    // Edge case: exactly 360° = 0° = first segment
    return wheelSegments[0];
}

// =====================================================
// INITIALIZATION
// =====================================================

function initWheel() {
    calculateSegments();
    applyWheelStyle();
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initWheel);

// =====================================================
// DEBUG FUNCTIONS
// =====================================================

// Synchronous probability check that draws uniformly from the wheel without
// running the animation. spinWheel() is now async (callback-based) so this
// shortcut keeps the test dev tool useful from the console.
function testWheelProbabilities(iterations = 1000) {
    const counts = {};
    wheelSegments.forEach(s => {
        const key = `${s.type}_${s.tonality}`;
        counts[key] = 0;
    });

    for (let i = 0; i < iterations; i++) {
        const angle = Math.random() * 360;
        const seg = calculateSegmentFromRotation(angle);
        counts[`${seg.type}_${seg.tonality}`]++;
    }

    const segmentsPerKey = {};
    wheelSegments.forEach(s => {
        const key = `${s.type}_${s.tonality}`;
        segmentsPerKey[key] = (segmentsPerKey[key] || 0) + 1;
    });

    console.log(`\n=== Wheel Probability Test (${iterations} draws) ===`);
    for (const key of Object.keys(counts)) {
        const actual = (counts[key] / iterations * 100).toFixed(1);
        const expected = (segmentsPerKey[key] / wheelSegments.length * 100).toFixed(1);
        console.log(`${key}: ${actual}% (expected: ${expected}%)`);
    }
}

function testSpecificAngles() {
    console.log("\n=== Testing specific angles ===");
    const testRotations = [0, 36, 72, 144, 180, 216, 288, 324, 359];

    for (const rot of testRotations) {
        const pointerAngle = getPointerAngle(rot);
        const segment = calculateSegmentFromRotation(rot);
        console.log(`Rotation: ${rot}° → Pointer at: ${pointerAngle.toFixed(1)}° → ${segment.label} (${segment.tonality}, ×${segment.multiplier}) [${segment.startAngle}°-${segment.endAngle}°]`);
    }
}

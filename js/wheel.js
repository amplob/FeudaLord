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

// =====================================================
// WHEEL SPINNING LOGIC
// =====================================================

let currentRotation = 0;
let lastSpinDurationMs = 3000;

/**
 * Spin the wheel to a random position and return the landed segment
 * (includes type, tonality, multiplier, label, color).
 */
function spinWheel() {
    // 3-9 full rotations + random final position. Duration scales with rotation
    // count so short spins feel snappy and long spins feel epic — gives each
    // spin a visibly different motion even though the outcome is already
    // uniformly distributed.
    const fullRotations = 3 + Math.floor(Math.random() * 7);
    const randomAngle = Math.random() * 360;
    const totalSpin = (fullRotations * 360) + randomAngle;

    currentRotation += totalSpin;
    lastSpinDurationMs = 2500 + fullRotations * 200;

    const segment = calculateSegmentFromRotation(currentRotation);

    console.log(`Spin: +${totalSpin.toFixed(1)}° (${fullRotations} rot, ${lastSpinDurationMs}ms) | Total: ${currentRotation.toFixed(1)}° | Pointer at: ${getPointerAngle(currentRotation).toFixed(1)}° | Result: ${segment.type} (${segment.tonality}, ×${segment.multiplier})`);

    return segment;
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

/**
 * Animate the wheel to its current rotation.
 */
function animateWheel(callback) {
    const wheel = document.getElementById("wheel");
    if (!wheel) {
        if (callback) callback();
        return;
    }

    const durationSec = (lastSpinDurationMs / 1000).toFixed(2);
    wheel.style.transition = `transform ${durationSec}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        if (callback) callback();
    }, lastSpinDurationMs + 100);
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

function testWheelProbabilities(iterations = 1000) {
    const counts = {};
    wheelSegments.forEach(s => {
        const key = `${s.type}_${s.tonality}`;
        counts[key] = 0;
    });

    const savedRotation = currentRotation;

    for (let i = 0; i < iterations; i++) {
        const seg = spinWheel();
        counts[`${seg.type}_${seg.tonality}`]++;
    }

    currentRotation = savedRotation;

    const segmentsPerKey = {};
    wheelSegments.forEach(s => {
        const key = `${s.type}_${s.tonality}`;
        segmentsPerKey[key] = (segmentsPerKey[key] || 0) + 1;
    });

    console.log(`\n=== Wheel Probability Test (${iterations} spins) ===`);
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

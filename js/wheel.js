// =====================================================
// WHEEL OF AUGURIES - CONFIGURATION
// =====================================================
// Single source of truth for wheel segments.
// The CSS gradient is generated from this config.
// To modify the wheel, just edit this array!
// =====================================================

// 8 equal-sized slices (45° each). Interleaved so no two same types
// are adjacent. Counts: 4 decision, 2 investment, 2 event → probabilities
// 50% / 25% / 25%. Pattern: D I D E D I D E.
const wheelConfig = [
    { type: "decision",   label: "⚖️ Decision",   icon: "⚖️", color: "#b8860b" },
    { type: "investment", label: "🔨 Investment", icon: "🔨", color: "#2e5a1c" },
    { type: "decision",   label: "⚖️ Decision",   icon: "⚖️", color: "#b8860b" },
    { type: "event",      label: "🎲 Event",      icon: "🎲", color: "#8b1a1a" },
    { type: "decision",   label: "⚖️ Decision",   icon: "⚖️", color: "#b8860b" },
    { type: "investment", label: "🔨 Investment", icon: "🔨", color: "#2e5a1c" },
    { type: "decision",   label: "⚖️ Decision",   icon: "⚖️", color: "#b8860b" },
    { type: "event",      label: "🎲 Event",      icon: "🎲", color: "#8b1a1a" },
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
            label: config.label,
            icon: config.icon,
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

/**
 * Spin the wheel to a random position and return the result.
 */
function spinWheel() {
    // Generate random spin: 5-7 full rotations + random final position
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const randomAngle = Math.random() * 360;
    const totalSpin = (fullRotations * 360) + randomAngle;
    
    // Add to current rotation
    currentRotation += totalSpin;
    
    // Calculate result based on where the pointer lands
    const result = calculateResultFromRotation(currentRotation);
    
    console.log(`Spin: +${totalSpin.toFixed(1)}° | Total: ${currentRotation.toFixed(1)}° | Pointer at: ${getPointerAngle(currentRotation).toFixed(1)}° | Result: ${result}`);
    
    return result;
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
 * Determine which segment the pointer is pointing at.
 */
function calculateResultFromRotation(rotation) {
    const pointerAngle = getPointerAngle(rotation);
    
    for (const segment of wheelSegments) {
        if (pointerAngle >= segment.startAngle && pointerAngle < segment.endAngle) {
            return segment.type;
        }
    }
    
    // Edge case: exactly 360° = 0° = first segment
    return wheelSegments[0].type;
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
    
    wheel.style.transition = "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)";
    wheel.style.transform = `rotate(${currentRotation}deg)`;
    
    setTimeout(() => {
        if (callback) callback();
    }, 3100);
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
// UTILITY
// =====================================================

function symbolFor(resource) {
    const symbols = {
        gold: "💰",
        food: "🌾",
        manpower: "👥",
        favor: "👑"
    };
    return symbols[resource] || resource;
}

// =====================================================
// DEBUG FUNCTIONS
// =====================================================

function testWheelProbabilities(iterations = 1000) {
    const counts = {};
    wheelSegments.forEach(s => counts[s.type] = 0);

    const savedRotation = currentRotation;

    for (let i = 0; i < iterations; i++) {
        const result = spinWheel();
        counts[result]++;
    }

    currentRotation = savedRotation;

    const segmentsPerType = {};
    wheelSegments.forEach(s => {
        segmentsPerType[s.type] = (segmentsPerType[s.type] || 0) + 1;
    });

    console.log(`\n=== Wheel Probability Test (${iterations} spins) ===`);
    for (const type of Object.keys(counts)) {
        const actual = (counts[type] / iterations * 100).toFixed(1);
        const expected = (segmentsPerType[type] / wheelSegments.length * 100).toFixed(1);
        console.log(`${type}: ${actual}% (expected: ${expected}%)`);
    }
}

function testSpecificAngles() {
    console.log("\n=== Testing specific angles ===");
    const testRotations = [0, 36, 72, 144, 180, 216, 288, 324, 359];
    
    for (const rot of testRotations) {
        const pointerAngle = getPointerAngle(rot);
        const result = calculateResultFromRotation(rot);
        const segment = wheelSegments.find(s => s.type === result);
        console.log(`Rotation: ${rot}° → Pointer at: ${pointerAngle.toFixed(1)}° → ${segment.label} (${segment.startAngle}°-${segment.endAngle}°)`);
    }
}

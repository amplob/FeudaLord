// =====================================================
// WHEEL OF AUGURIES - CONFIGURATION
// =====================================================
// Single source of truth for wheel segments.
// The CSS gradient is generated from this config.
// To modify the wheel, just edit this array!
// =====================================================

const wheelConfig = [
    { 
        type: "investment", 
        label: "🏗️ Investment",
        color: "#2e5a1c",
        probability: 0.4  // 40%
    },
    { 
        type: "decision", 
        label: "⚖️ Decision",
        color: "#b8860b",
        probability: 0.4  // 40%
    },
    { 
        type: "fate", 
        label: "🎲 Fate",
        color: "#8b1a1a",
        probability: 0.2  // 20%
    }
];

// =====================================================
// CALCULATED SEGMENTS (from config)
// =====================================================
// Segments are calculated automatically from probabilities.
// In CSS conic-gradient, 0° is at 12 o'clock (top).

let wheelSegments = [];

function calculateSegments() {
    wheelSegments = [];
    let currentAngle = 0;
    
    for (const config of wheelConfig) {
        const angleDegrees = config.probability * 360;
        wheelSegments.push({
            type: config.type,
            label: config.label,
            color: config.color,
            startAngle: currentAngle,
            endAngle: currentAngle + angleDegrees
        });
        currentAngle += angleDegrees;
    }
    
    // Log for debugging
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
    console.log("Wheel gradient applied:", generateWheelGradient());
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
    
    console.log(`\n=== Wheel Probability Test (${iterations} spins) ===`);
    for (const segment of wheelSegments) {
        const actual = (counts[segment.type] / iterations * 100).toFixed(1);
        const expected = (segment.probability * 100).toFixed(1);
        console.log(`${segment.label}: ${actual}% (expected: ${expected}%)`);
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

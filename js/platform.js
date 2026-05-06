// =====================================================
// PLATFORM DETECTION
// =====================================================
// One of three labels, exposed as a global so any module can branch:
//   "capacitor-android" — wrapped as a native Android app via Capacitor.
//                         localStorage is backed by SharedPreferences and only
//                         clears on uninstall / explicit "Clear data".
//   "web-mobile"        — phone browser. localStorage is decent on Chrome
//                         Android but can be evicted under storage pressure.
//   "web-desktop"       — desktop browser. localStorage is the most reliable
//                         of the three browser cases.
//
// Cloud-save policy uses IS_NATIVE to decide whether to debounce per save
// (web) or only sync on integrity events (native).
// =====================================================

const PLATFORM = (() => {
    if (typeof window !== "undefined"
        && window.Capacitor
        && typeof window.Capacitor.isNativePlatform === "function"
        && window.Capacitor.isNativePlatform()) {
        return "capacitor-android";
    }
    if (typeof navigator !== "undefined"
        && /Mobi|Android/i.test(navigator.userAgent || "")) {
        return "web-mobile";
    }
    return "web-desktop";
})();

const IS_NATIVE = PLATFORM === "capacitor-android";

console.log(`[platform] ${PLATFORM}`);

// =====================================================
// FIREBASE INITIALIZATION
// =====================================================
// We use the compat SDKs (loaded via <script> in index.html) because the
// codebase has no bundler — the modular SDK requires ES module imports.
// The apiKey here is *not* a secret: Firebase web API keys identify the
// project but don't grant access. Security is enforced by Firestore Rules
// (per-user owned docs) and the Authorized Domains list in Firebase Auth.
// =====================================================

const firebaseConfig = {
    apiKey: "AIzaSyDxZx4oWCXrKpBZEgu3ycuCdGn164wjJzs",
    authDomain: "feudalord-469b6.firebaseapp.com",
    projectId: "feudalord-469b6",
    storageBucket: "feudalord-469b6.firebasestorage.app",
    messagingSenderId: "243539200388",
    appId: "1:243539200388:web:6bcb8d89dbde3718db35d1",
};

firebase.initializeApp(firebaseConfig);

const fbAuth = firebase.auth();
const fbDb = firebase.firestore();

console.log("[firebase] initialized");

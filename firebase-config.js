// ====================================================================
// ملف ضبط الاتصال بقاعدة البيانات المشتركة (Firebase)
// هذا الملف هو "الجسر" الذي يربط بين برنامج المفتش الفرعي وبرنامج المفتش المركزي
// ====================================================================

const firebaseConfig = {
  apiKey: "AIzaSyBaXzHNkS7f7ec7ipNg9rVfscER3ae8aNA",
  authDomain: "inspection-system-saed.firebaseapp.com",
  databaseURL: "https://inspection-system-saed-default-rtdb.firebaseio.com",
  projectId: "inspection-system-saed",
  storageBucket: "inspection-system-saed.firebasestorage.app",
  messagingSenderId: "522722341414",
  appId: "1:522722341414:web:9dafddbb21fd695d1aace7"
};

let db = null;
try {
  const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "REPLACE_ME" && firebaseConfig.databaseURL && firebaseConfig.databaseURL !== "REPLACE_ME";
  if (isConfigured && typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
  } else {
    console.warn('⚠️ Firebase لم يُضبَط بعد — يعمل النظام بوضع احتياطي محلي (نفس الجهاز فقط). راجع ملف firebase-config.js للتعليمات.');
  }
} catch (e) {
  console.warn('⚠️ تعذرت تهيئة Firebase:', e.message);
}

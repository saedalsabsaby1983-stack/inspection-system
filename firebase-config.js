// ====================================================================
// ملف ضبط الاتصال بقاعدة البيانات المشتركة (Firebase)
// هذا الملف هو "الجسر" الذي يربط بين برنامج المفتش الفرعي وبرنامج المفتش المركزي
// ====================================================================
//
// ⚠️ تعليمات الإعداد (مرة واحدة فقط):
// 1) اذهب إلى https://console.firebase.google.com وأنشئ مشروعاً جديداً
// 2) من إعدادات المشروع → "Add app" → اختر Web (</>) → انسخ بيانات firebaseConfig
// 3) فعّل "Realtime Database" من القائمة الجانبية (Build → Realtime Database → Create Database)
// 4) اضبط قواعد القراءة/الكتابة (Rules) كما هو موضح في ملف التعليمات المرفق
// 5) استبدل القيم أدناه ببياناتك الحقيقية، ثم احفظ الملف
//
// طالما القيم أدناه لم تُستبدل، يعمل النظام بوضع احتياطي محلي (نفس الجهاز فقط)
// بدون أي خطأ في الصفحة، إلى أن يتم الضبط.
// ====================================================================

const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  databaseURL: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
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


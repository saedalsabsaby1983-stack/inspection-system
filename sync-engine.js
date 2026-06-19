// ====================================================================
// محرك المزامنة والتتبع اللحظي — "الجسر" بين المفتش الفرعي والمركزي
// يعمل بدون إنترنت بالكامل، ويُزامن تلقائياً عند توفر الشبكة
// ====================================================================

const SyncEngine = (function() {

  let dbLocal = null;          // قاعدة بيانات محلية (IndexedDB) — تعمل بدون نت
  let firebaseReady = false;   // هل Firebase مهيأ بنجاح؟
  let isOnline = navigator.onLine;
  let inspectorInfo = { id: '', name: '', province: '' };
  let onStatusChange = () => {};
  let onDataReceived = () => {};
  let presenceRef = null;
  let watchPositionId = null;

  const DB_NAME = 'inspection_offline_db';
  const STORE_NAME = 'pending_forms';

  // ---------- 1) تهيئة قاعدة البيانات المحلية (IndexedDB) ----------
  function initLocalDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });
        }
      };
      req.onsuccess = (e) => { dbLocal = e.target.result; resolve(dbLocal); };
      req.onerror = (e) => reject(e);
    });
  }

  // ---------- 2) حفظ استمارة محلياً فوراً (يعمل دائماً، حتى بدون نت) ----------
  function saveLocal(formData) {
    return new Promise((resolve, reject) => {
      if (!dbLocal) { resolve(false); return; }
      formData._syncStatus = formData._syncStatus || 'pending'; // pending | synced
      formData._savedAt = formData._savedAt || new Date().toISOString();
      const tx = dbLocal.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(formData);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    });
  }

  // ---------- 3) قراءة كل الاستمارات المحفوظة محلياً ----------
  function getAllLocal() {
    return new Promise((resolve) => {
      if (!dbLocal) { resolve([]); return; }
      const tx = dbLocal.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  // ---------- 4) محاولة مزامنة كل الاستمارات المعلّقة مع Firebase ----------
  async function syncPendingForms() {
    if (!firebaseReady || !isOnline) return { synced: 0, total: 0 };
    const all = await getAllLocal();
    const pending = all.filter(f => f._syncStatus !== 'synced');
    let syncedCount = 0;
    for (const form of pending) {
      try {
        await db.ref('inspections/' + form.sessionId).set(form);
        form._syncStatus = 'synced';
        form._syncedAt = new Date().toISOString();
        await saveLocal(form);
        syncedCount++;
      } catch (e) {
        console.warn('فشل مزامنة الاستمارة', form.sessionId, e);
      }
    }
    onStatusChange({ online: isOnline, synced: syncedCount, pendingLeft: pending.length - syncedCount });
    return { synced: syncedCount, total: pending.length };
  }

  // ---------- 5) تتبع حالة الاتصال بالشبكة ----------
  function watchConnectivity() {
    window.addEventListener('online', () => {
      isOnline = true;
      onStatusChange({ online: true, message: 'تم استرجاع الاتصال — جاري المزامنة...' });
      syncPendingForms();
      updatePresence(true);
    });
    window.addEventListener('offline', () => {
      isOnline = false;
      onStatusChange({ online: false, message: 'لا يوجد اتصال — يتم الحفظ محلياً وسيتم الإرسال تلقائياً عند توفر الشبكة' });
      updatePresence(false);
    });
    // محاولة مزامنة دورية كل 15 ثانية في حال وجود نت
    setInterval(() => { if (isOnline && firebaseReady) syncPendingForms(); }, 15000);
  }

  // ---------- 6) تتبع لحظي لحالة المفتش (متصل/غير متصل + آخر ظهور) ----------
  function updatePresence(online) {
    if (!firebaseReady || !inspectorInfo.id) return;
    try {
      const ref = db.ref('presence/' + inspectorInfo.id);
      const ts = (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue) ? firebase.database.ServerValue.TIMESTAMP : Date.now();
      ref.set({
        name: inspectorInfo.name,
        province: inspectorInfo.province,
        online: online,
        lastSeen: ts,
        lastLocation: lastKnownLocation || null
      });
      if (online) {
        ref.onDisconnect().update({ online: false, lastSeen: ts });
      }
    } catch(e) {}
  }

  let lastKnownLocation = null;

  // ---------- 7) تتبع GPS لحظي (يُرسل فقط عند توفر الشبكة، يُخزَّن محلياً دوماً) ----------
  function startLiveLocationTracking() {
    if (!navigator.geolocation) return;
    watchPositionId = navigator.geolocation.watchPosition((pos) => {
      lastKnownLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: new Date().toISOString()
      };
      if (firebaseReady && isOnline && inspectorInfo.id) {
        try {
          db.ref('presence/' + inspectorInfo.id + '/lastLocation').set(lastKnownLocation);
        } catch(e) {}
      }
    }, () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
  }

  function stopLiveLocationTracking() {
    if (watchPositionId !== null) navigator.geolocation.clearWatch(watchPositionId);
  }

  // ---------- 8) تهيئة Firebase (يُستخدَم إن وُجد ملف الضبط) ----------
  function tryInitFirebase() {
    try {
      if (typeof db !== 'undefined' && db !== null) {
        firebaseReady = true;
        return true;
      }
    } catch(e) {}
    firebaseReady = false;
    return false;
  }

  // ---------- الواجهة العامة ----------
  return {
    async init(inspector, callbacks = {}) {
      inspectorInfo = inspector || inspectorInfo;
      onStatusChange = callbacks.onStatusChange || onStatusChange;
      onDataReceived = callbacks.onDataReceived || onDataReceived;
      await initLocalDB();
      tryInitFirebase();
      watchConnectivity();
      if (isOnline) { await syncPendingForms(); updatePresence(true); }
      onStatusChange({ online: isOnline, ready: true });
    },
    setInspectorInfo(info) { inspectorInfo = { ...inspectorInfo, ...info }; },
    saveLocal,
    getAllLocal,
    syncPendingForms,
    startLiveLocationTracking,
    stopLiveLocationTracking,
    isOnline: () => isOnline,
    isFirebaseReady: () => firebaseReady,
    // إرسال استمارة: تُحفظ محلياً فوراً، وتُزامَن تلقائياً إن توفرت الشبكة
    async submitForm(formData) {
      await saveLocal(formData);
      if (isOnline && firebaseReady) {
        await syncPendingForms();
      }
      return { savedLocally: true, online: isOnline };
    },
    // للمركزي: الاستماع اللحظي لكل الاستمارات الواردة
    listenToInspections(callback) {
      if (!firebaseReady) return;
      db.ref('inspections').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        callback(Object.values(data));
      });
    },
    // للمركزي: الاستماع اللحظي لحالة جميع المفتشين (متصل/غير متصل + الموقع)
    listenToPresence(callback) {
      if (!firebaseReady) return;
      db.ref('presence').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        callback(data);
      });
    },
    // للمركزي: تحديث قرار على استمارة معينة (يُزامَن تلقائياً للفرعي إن أراد رؤيته)
    async updateDecision(sessionId, decision) {
      if (!firebaseReady) return false;
      try {
        await db.ref('inspections/' + sessionId + '/_central').update(decision);
        return true;
      } catch(e) { return false; }
    }
  };
})();

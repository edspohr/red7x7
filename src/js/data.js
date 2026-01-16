import { db } from "./firebaseConfig.js";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  getDoc,
  setDoc,
  deleteDoc,
  where,
} from "firebase/firestore";

// --- Announcements ---
export const subscribeToAnnouncements = (callback) => {
  const q = query(collection(db, "announcements"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(announcements);
  });
};

export const addAnnouncement = async (
  text,
  isPinned = false,
  author = "Admin"
) => {
  await addDoc(collection(db, "announcements"), {
    text,
    isPinned,
    author,
    date: new Date().toISOString(),
  });
};

export const deleteAnnouncement = async (id) => {
  await deleteDoc(doc(db, "announcements", id));
};

export const togglePinAnnouncement = async (id, currentStatus) => {
  await updateDoc(doc(db, "announcements", id), { isPinned: !currentStatus });
};

// --- Users (Admin Manual Add) ---
export const addUserProfile = async (userData) => {
  // Check for duplicate by email first
  const q = query(
    collection(db, "users"),
    where("email", "==", userData.email)
  );
  const snap = await getDocs(q);

  if (!snap.empty) {
    throw new Error("El usuario ya existe con ese email.");
  }

  await addDoc(collection(db, "users"), {
    ...userData,
    role: "socio7x7",
    createdAt: new Date().toISOString(),
  });
};

export const deleteUser = async (uid) => {
  await deleteDoc(doc(db, "users", uid));
};

export const uploadUsersFromCSV = async (usersList) => {
  const batchPromises = usersList.map(async (user) => {
    // Basic validation
    if (!user.email || !user.name) return null;

    // Check duplicates? For now just add, assuming admin knows what they are doing or we rely on email check later.
    // Actually, let's just addDoc.
    return addDoc(collection(db, "users"), {
      name: user.name,
      email: user.email,
      company: user.company || "",
      position: user.position || "",
      phone: user.phone || "",
      role: "socio7x7",
      createdAt: new Date().toISOString(),
      source: "csv_import",
    });
  });

  await Promise.all(batchPromises);
};

// --- Meetings ---
export const subscribeToMeetings = (callback) => {
  const q = query(collection(db, "meetings"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const meetings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(meetings);
  });
};

export const addMeeting = async (meetingData) => {
  await addDoc(collection(db, "meetings"), meetingData);
};

export const updateMeeting = async (id, updates) => {
  const meetingRef = doc(db, "meetings", id);
  await updateDoc(meetingRef, updates);
};

// --- Users / Directory ---
export const fetchDirectory = async () => {
  const apiUsers = await getDocs(collection(db, "users"));
  const users = {};
  apiUsers.forEach((doc) => {
    users[doc.id] = { id: doc.id, ...doc.data() };
  });
  return users;
};

// Legacy exports for smoother transition?
// No, we should update UI to use the new functions.
// But some UI parts might expect synchronous arrays.
// We will handle that in ui.js refactor.

export const updateUserRole = async (uid, newRole) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { role: newRole });
};

// --- Networking Pro Credits ---

export const checkAndResetProQuota = async (userId) => {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

  if (data.proQuotaPeriod !== currentPeriod) {
    // New month, reset quota
    await updateDoc(userRef, {
      proQuotaPeriod: currentPeriod,
      proUnlockCount: 0,
    });
    return { count: 0, period: currentPeriod };
  }
  return { count: data.proUnlockCount || 0, period: data.proQuotaPeriod };
};

export const getUnlockedContacts = async (userId) => {
  // Determine active unlocks.
  // In a real app we might query subcollection.
  // simpler: users/{uid}/unlockedContacts/{targetUid}
  // We can just fetch all and filter by date.
  const unlocksRef = collection(db, `users/${userId}/unlockedContacts`);
  const q = query(unlocksRef);
  const snap = await getDocs(q);
  const unlocks = {};
  const now = new Date();

  snap.forEach((d) => {
    const data = d.data();
    const expiresAt = new Date(data.expiresAt); // stored as ISO string or timestamp
    if (expiresAt > now) {
      unlocks[d.id] = true;
    }
  });
  return unlocks;
};

export const unlockContact = async (userId, targetId) => {
  const userRef = doc(db, "users", userId);
  const targetUnlockRef = doc(
    db,
    `users/${userId}/unlockedContacts/${targetId}`
  );

  // We assume validation happened in UI/Controller (Optimistic), but ideally transaction here.
  const snap = await getDoc(userRef);
  const count = snap.data().proUnlockCount || 0;

  if (count >= 5)
    throw new Error("Has alcanzado tu límite mensual de 5 contactos.");

  await updateDoc(userRef, {
    proUnlockCount: count + 1,
  });

  // Expiry: 50 Years (effectively permanent)
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 50);

  await setDoc(targetUnlockRef, {
    unlockedAt: new Date().toISOString(),
    expiresAt: expires.toISOString(),
    targetId: targetId,
  });
};

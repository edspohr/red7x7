import { db } from './firebaseConfig.js';
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
    deleteDoc
} from "firebase/firestore";

// --- Announcements ---
export const subscribeToAnnouncements = (callback) => {
    const q = query(collection(db, "announcements"), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
        const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(announcements);
    });
};

export const addAnnouncement = async (text, isPinned = false, author = "Admin") => {
    await addDoc(collection(db, "announcements"), {
        text,
        isPinned,
        author,
        date: new Date().toISOString()
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
    // We use setDoc with a custom ID or addDoc? 
    // If we want them to claim it via Auth later, email is the key, but Auth UIDs are random.
    // Strategy: Create a doc with an auto-ID. When they register, Auth creates a NEW UID.
    // Problem: Syncing.
    // Alternative: Just use addDoc. When they register, logic in auth.js checks for existing doc? 
    // No, auth.js checks `doc(db, "users", user.uid)`.
    // We cannot predict `user.uid`. 
    // So "Manual Add" creates a "Ghost" user. Merging is hard.
    // Compromise: Admin creates a "Ghost" user that shows in directory.
    // If that user eventually signs up, they get a NEW profile. Admin has to delete the ghost.
    // Unless we use Email as ID? No, Firestore Users collection is keyed by UID.
    // Let's just use addDoc for now to populate the directory as requested.
    await addDoc(collection(db, "users"), {
        ...userData,
        role: 'socio7x7',
        createdAt: new Date().toISOString()
    });
};

// --- Meetings ---
export const subscribeToMeetings = (callback) => {
    const q = query(collection(db, "meetings"), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
        const meetings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    apiUsers.forEach(doc => {
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
            proUnlockCount: 0
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
    
    snap.forEach(d => {
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
    const targetUnlockRef = doc(db, `users/${userId}/unlockedContacts/${targetId}`);
    
    // We assume validation happened in UI/Controller (Optimistic), but ideally transaction here.
    const snap = await getDoc(userRef);
    const count = snap.data().proUnlockCount || 0;
    
    if (count >= 5) throw new Error("Has alcanzado tu límite mensual de 5 contactos.");

    await updateDoc(userRef, {
        proUnlockCount: count + 1
    });

    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await setDoc(targetUnlockRef, {
        unlockedAt: new Date().toISOString(),
        expiresAt: expires.toISOString(),
        targetId: targetId
    });
};

import { db } from './firebaseConfig.js';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    getDocs,
    doc,
    updateDoc
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

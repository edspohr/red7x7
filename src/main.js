import './style.css';
import { createIcons } from 'lucide';
import { 
    subscribeToAnnouncements, 
    subscribeToMeetings, 
    fetchDirectory, 
    addAnnouncement, 
    addMeeting,
    updateMeeting
} from './js/data.js';
import { 
    handleEmailLogin, 
    handleRegister, 
    handleForgotPassword, 
    handleLogout, 
    showToast,
    setOnLoginSuccess,
    updateCurrentUser
} from './js/auth.js';
import { 
    initializeAppUI, 
    showScreen, 
    renderAnnouncements, 
    renderMeetings,
    renderDashboardStats,
    renderAdminPanels,
    renderDirectory,
    renderProfileForm
} from './js/ui.js';
import { handleProcessMeetingAI } from './js/ai.js';

// --- State Management ---
let state = {
    currentUser: null,
    announcements: [],
    meetings: [],
    users: {}
};

// --- Initialization ---

// auth.js handles the initial auth check and calls this:
setOnLoginSuccess(async (user) => {
    state.currentUser = user;
    initializeAppUI(user);
    
    // 1. Fetch Directory (One-time fetch for now, or could be subscription)
    try {
        state.users = await fetchDirectory();
        refreshUI();
    } catch(e) { console.error("Dir fetch error", e); }

    // 2. Subscribe to Data
    subscribeToAnnouncements((data) => {
        state.announcements = data;
        refreshUI();
    });

    subscribeToMeetings((data) => {
        state.meetings = data;
        refreshUI();
    });
});

const refreshUI = () => {
    if (!state.currentUser) return;
    const { currentUser, announcements, meetings, users } = state;
    
    renderAnnouncements(announcements, currentUser);
    renderMeetings(meetings, users, currentUser, showEditModal); // Pass modal handler
    renderAdminPanels(currentUser, users);
    renderDirectory(users, currentUser, ''); // Initial render
    
    // Stats calculation
    const statsData = {
        announcementCount: announcements.length,
        upcomingMeetingsCount: meetings.filter(m => m.date >= new Date().toISOString().split('T')[0]).length,
        userCount: Object.keys(users).length,
        contactRequestsLeft: currentUser.contactRequestsLeft
    };
    renderDashboardStats(statsData, currentUser);
    
    renderProfileForm(currentUser);
};

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // Auth Forms
    document.getElementById('login-form').addEventListener('submit', handleEmailLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('forgot-password-form').addEventListener('submit', handleForgotPassword);
    
    // Navigation
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    
    document.getElementById('register-link').addEventListener('click', (e) => {
        e.preventDefault(); showScreen('register');
    });
    document.getElementById('login-link-from-register').addEventListener('click', (e) => {
        e.preventDefault(); showScreen('login');
    });
    document.getElementById('login-link-from-forgot').addEventListener('click', (e) => {
        e.preventDefault(); showScreen('login');
    });
    document.getElementById('forgot-password-link').addEventListener('click', (e) => {
        e.preventDefault(); showScreen('forgot');
    });

    document.getElementById('profile-button').addEventListener('click', () => {
        showScreen('profile');
        renderProfileForm(state.currentUser);
    });
    document.getElementById('cancel-profile').addEventListener('click', () => showScreen('app'));

    // Profile Save
    document.getElementById('save-profile').addEventListener('click', async () => {
        const updates = {
            name: document.getElementById('profile-name').value,
            company: document.getElementById('profile-company').value,
            position: document.getElementById('profile-position').value,
            phone: document.getElementById('profile-phone').value
        };
        await updateCurrentUser(updates);
        // Optimistic local update is handled in auth.js, but we might want to refresh UI if needed
    });

    // Admin: Create Announcement
    const submitAnnBtn = document.getElementById('submit-announcement');
    if(submitAnnBtn) {
        submitAnnBtn.addEventListener('click', async () => {
            const text = document.getElementById('announcement-text').value;
            const isPinned = document.getElementById('pin-announcement').checked;
            if (!text) return showToast('Escribe un texto', 'warning');
            
            await addAnnouncement(text, isPinned, state.currentUser.name);
            document.getElementById('announcement-text').value = '';
            showToast('Anuncio publicado', 'success');
        });
    }

    // Admin: Create Meeting
    const submitMeetingBtn = document.getElementById('submit-meeting');
    if(submitMeetingBtn) {
        submitMeetingBtn.addEventListener('click', async () => {
            const title = document.getElementById('meeting-title').value;
            const date = document.getElementById('meeting-date').value;
            const summary = document.getElementById('meeting-summary').value;
            
            if (!title || !date) return showToast('Completa título y fecha', 'warning');
            
            // Collect selected participants
            const selected = Array.from(document.querySelectorAll('.participant-checkbox:checked')).map(cb => cb.value);
            
            await addMeeting({
                title,
                date,
                summary,
                participants: selected,
                createdAt: new Date().toISOString()
            });
            
            showToast('Reunión registrada', 'success');
            // Clear form
            document.getElementById('meeting-title').value = '';
            document.getElementById('meeting-summary').value = '';
        });
    }
    
    // AI
    const aiBtn = document.getElementById('process-meeting-ai');
    if(aiBtn) aiBtn.addEventListener('click', () => handleProcessMeetingAI(state.users));

    // Directory Search
    const searchInput = document.getElementById('search-directory');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderDirectory(state.users, state.currentUser, e.target.value);
        });
    }

    // Modal Close
    document.getElementById('close-modal-button').addEventListener('click', () => {
        document.getElementById('user-details-modal').classList.add('hidden');
    });
    
    // Edit Modal Logic
    document.getElementById('cancel-edit-meeting').addEventListener('click', () => {
        document.getElementById('edit-meeting-modal').classList.add('hidden');
    });
    
    document.getElementById('save-meeting-changes').addEventListener('click', async () => {
        const id = document.getElementById('edit-meeting-id').value;
        const updates = {
            title: document.getElementById('edit-meeting-title').value,
            date: document.getElementById('edit-meeting-date').value,
            summary: document.getElementById('edit-meeting-summary').value
            // participants update logic omitted for brevity in this phase
        };
        await updateMeeting(id, updates);
        document.getElementById('edit-meeting-modal').classList.add('hidden');
        showToast('Reunión actualizada', 'success');
    });

    createIcons();
});

// Helper for Edit Modal
const showEditModal = (meetingId) => {
    const meeting = state.meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    
    document.getElementById('edit-meeting-id').value = meetingId;
    document.getElementById('edit-meeting-title').value = meeting.title;
    document.getElementById('edit-meeting-date').value = meeting.date;
    document.getElementById('edit-meeting-summary').value = meeting.summary || '';
    
    document.getElementById('edit-meeting-modal').classList.remove('hidden');
};

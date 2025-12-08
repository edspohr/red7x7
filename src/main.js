import './style.css';
import "toastify-js/src/toastify.css";
import { createIcons } from 'lucide';
import { 
    subscribeToAnnouncements, 
    addAnnouncement, 
    subscribeToMeetings, 
    addMeeting, 
    updateMeeting,
    fetchDirectory,
    updateUserRole,
    checkAndResetProQuota,
    getUnlockedContacts,
    unlockContact
} from './js/data.js';
import { 
    handleEmailLogin, 
    handleGoogleLogin,
    handleRegister, 
    handleForgotPassword, 
    handleLogout, 
    showToast,
    setOnLoginSuccess,
    setOnLogout,
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
    renderProfileForm,
    renderHeader
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

// Global Error Handler for "White Screen" debugging
window.addEventListener('error', (event) => {
    console.error("Global Error Caught:", event.error);
    // Optional: show user friendly error if stuck on loading
    const loading = document.getElementById('loading-screen');
    if(loading && loading.style.display !== 'none') {
        loading.innerHTML = `<div class="p-4 text-red-600 font-bold text-center">Error cargando la aplicación.<br><span class="text-sm font-normal text-gray-800">${event.message}</span><br><button onclick="window.location.reload()" class="mt-4 btn btn-primary">Reintentar</button></div>`;
    }
});

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

setOnLogout(() => {
    showScreen('login');
});

const refreshUI = async () => {
    if (!state.currentUser) return;
    
    // Check quota and unlocks if Pro
    if (state.currentUser.role === 'pro') {
         const quota = await checkAndResetProQuota(state.currentUser.id);
         if (quota) {
             state.contactRequestsLeft = 5 - (quota.count || 0);
             // Attach to user object for UI convenience
             state.currentUser.contactRequestsLeft = state.contactRequestsLeft;
         }
         state.unlockedContacts = await getUnlockedContacts(state.currentUser.id);
    } else {
        state.unlockedContacts = {};
    }

    const { currentUser, announcements, meetings, users, unlockedContacts } = state;

    // Pass data to UI
    renderHeader(currentUser);
    renderDashboardStats({
        announcementCount: announcements.length,
        upcomingMeetingsCount: meetings.filter(m => new Date(m.date) > new Date()).length,
        userCount: Object.keys(users).length,
        contactRequestsLeft: state.contactRequestsLeft
    }, currentUser);
    
    renderAnnouncements(announcements, currentUser);
    renderMeetings(meetings, users, currentUser, (id) => {
        // Edit Meeting Handler
        const meeting = meetings.find(m => m.id === id);
        if(meeting) openMeetingModal(meeting);
    });
    
    // Pass unlockedContacts to directory
    renderDirectory(users, currentUser, document.getElementById('search-directory')?.value || '', unlockedContacts);
    
    renderAdminPanels(currentUser, users);
    renderProfileForm(currentUser);
};

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // Auth Forms
    document.getElementById('login-form').addEventListener('submit', handleEmailLogin);
    document.getElementById('google-login-button').addEventListener('click', handleGoogleLogin);
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
            phone: document.getElementById('profile-phone').value,
            description: document.getElementById('profile-description').value
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
            renderDirectory(state.users, state.currentUser, e.target.value, state.unlockedContacts);
        });
    }

    // Directory Actions (Unlock / Role Change)
    document.getElementById('directory-list').addEventListener('click', async (e) => {
        // Unlock Contact Handler
        if (e.target.closest('.unlock-contact-btn')) {
            const btn = e.target.closest('.unlock-contact-btn');
            const targetUid = btn.getAttribute('data-uid');
            const targetName = btn.getAttribute('data-name');
            
            if (state.contactRequestsLeft <= 0) {
                 showToast('Ya consumiste tus 5 créditos de este mes.', 'error');
                 return;
            }

            if(confirm(`¿Desbloquear datos de ${targetName}? \nConsumirá 1 crédito (de ${state.contactRequestsLeft}).\nDisponible por 24 horas.`)) {
                try {
                    await unlockContact(state.currentUser.id, targetUid);
                    showToast('Contacto desbloqueado', 'success');
                    refreshUI(); // Refresh to update view and quota
                } catch(err) {
                    console.error(err);
                    showToast(err.message, 'error');
                }
            }

        }
    });

    // Admin Role Change (Delegation) - keep existing logic but wrapped in change event listener block
    document.getElementById('directory-list').addEventListener('change', async (e) => {
        if (e.target.classList.contains('role-selector')) {
            const uid = e.target.getAttribute('data-uid');
            const newRole = e.target.value;
            if(confirm(`¿Cambiar rol de usuario a ${newRole}?`)) {
                try {
                    await updateUserRole(uid, newRole);

                    // Fix: Update local state immediately to reflect change in UI
                    if(state.users[uid]) {
                        state.users[uid].role = newRole;
                    }
                    
                    showToast('Rol actualizado', 'success');
                    refreshUI();
                } catch(err) {
                    console.error(err);
                    showToast('Error actualizando rol', 'error');
                }
            } else {
                // Revert selection if cancelled
                e.target.value = state.users[uid].role || 'socio7x7';
            }
        }
    });

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

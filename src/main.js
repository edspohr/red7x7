import './style.css';
import "toastify-js/src/toastify.css";
import { createIcons, icons } from 'lucide';

// Expose Lucide to window for ui.js to use
window.lucide = { createIcons, icons };
import { 
    subscribeToAnnouncements, 
    addAnnouncement, 
    subscribeToMeetings, 
    addMeeting, 
    updateMeeting,
    deleteAnnouncement,
    togglePinAnnouncement,
    addUserProfile,
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

// Failsafe: If app doesn't load in 8 seconds, show manual retry
setTimeout(() => {
    const loading = document.getElementById('loading-screen');
    if(loading && loading.style.display !== 'none') {
        loading.innerHTML = `
            <div class="flex flex-col items-center justify-center p-6 text-center">
                <i data-lucide="alert-circle" class="w-12 h-12 text-orange-500 mb-4"></i>
                <h3 class="text-lg font-bold text-gray-800">La carga está tardando...</h3>
                <p class="text-sm text-gray-600 mb-4">Puede que haya un problema de conexión.</p>
                <div class="space-x-4">
                    <button onclick="window.location.reload()" class="btn btn-primary bg-indigo-600 text-white px-4 py-2 rounded">Recargar</button>
                    <button onclick="document.getElementById('loading-screen').style.display='none'; document.getElementById('auth-container').style.display='flex';" class="btn btn-secondary bg-gray-200 text-gray-800 px-4 py-2 rounded">Ir al Login</button>
                </div>
            </div>`;
    }
}, 8000);

// auth.js handles the initial auth check and calls this:
setOnLoginSuccess(async (user) => {
    state.currentUser = user;
    initializeAppUI(user);
    
    // 1. Fetch Directory (One-time fetch for now, or could be subscription)
    try {
        state.users = await fetchDirectory();
        await refreshUI();
    } catch(e) { 
        console.error("Init Data Error", e); 
        // We generally don't want to stop the app here, but maybe show a toast
    }

    // 2. Subscribe to Data
    subscribeToAnnouncements(async (data) => {
        state.announcements = data;
        try { await refreshUI(); } catch(e) { console.error(e); }
    });

    subscribeToMeetings(async (data) => {
        state.meetings = data;
        try { await refreshUI(); } catch(e) { console.error(e); }
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
    // Initial Icon Render
    if(window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons({ icons: window.lucide.icons });
    }

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
        
        // Delegation for Pin/Delete
        document.getElementById('announcements-list').addEventListener('click', async (e) => {
            const pinBtn = e.target.closest('.toggle-pin-btn');
            const delBtn = e.target.closest('.delete-ann-btn');
            
            if (pinBtn) {
                const id = pinBtn.dataset.id;
                const ann = state.announcements.find(a => a.id === id);
                if(ann) {
                    await togglePinAnnouncement(id, ann.isPinned);
                    showToast(ann.isPinned ? 'Anuncio desanclado' : 'Anuncio fijado', 'success');
                }
            }
            
            if (delBtn) {
                if(confirm('¿Eliminar este anuncio?')) {
                    await deleteAnnouncement(delBtn.dataset.id);
                    showToast('Anuncio eliminado', 'success');
                }
            }
        });
    }

    // Admin: Create/Edit Meeting
    const submitMeetingBtn = document.getElementById('submit-meeting');
    if(submitMeetingBtn) {
        submitMeetingBtn.addEventListener('click', async () => {
            const id = document.getElementById('meeting-id').value; // Edit Mode ID
            const title = document.getElementById('meeting-title').value;
            const date = document.getElementById('meeting-date').value;
            const time = document.getElementById('meeting-time').value;
            const location = document.getElementById('meeting-location').value;
            const summary = document.getElementById('meeting-summary').value;
            
            if (!title || !date) return showToast('Completa título y fecha', 'warning');
            
            // Collect selected participants
            const selected = Array.from(document.querySelectorAll('.participant-checkbox:checked')).map(cb => cb.value);
            
            try {
                if (id) {
                    await updateMeeting(id, {
                        title, date, time, location, summary, participants: selected
                    });
                    showToast('Reunión actualizada', 'success');
                } else {
                    await addMeeting({
                        title, date, time, location, summary, participants: selected,
                        createdAt: new Date().toISOString()
                    });
                    showToast('Reunión registrada', 'success');
                }
                
                // Clear form & Reset Mode
                document.getElementById('meeting-id').value = '';
                document.getElementById('meeting-title').value = '';
                document.getElementById('meeting-date').value = '';
                document.getElementById('meeting-time').value = '';
                document.getElementById('meeting-location').value = '';
                document.getElementById('meeting-summary').value = '';
                document.querySelectorAll('.participant-checkbox').forEach(cb => cb.checked = false);
                submitMeetingBtn.innerHTML = '<i data-lucide="calendar-plus" class="w-4 h-4 mr-2"></i> Registrar Reunión';
                createIcons(); // Refresh icon on button
                
            } catch(e) {
                console.error(e);
                showToast('Error al guardar reunión', 'error');
            }
        });
    }

    // Meeting Actions (Edit Delegation)
    const meetingsList = document.getElementById('meetings-list');
    if(meetingsList) {
        meetingsList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-meeting-btn');
            if (editBtn) {
                const id = editBtn.dataset.id;
                const meeting = state.meetings.find(m => m.id === id);
                if (meeting) {
                    // Populate Form
                    document.getElementById('meeting-id').value = meeting.id;
                    document.getElementById('meeting-title').value = meeting.title;
                    document.getElementById('meeting-date').value = meeting.date;
                    if(meeting.time) document.getElementById('meeting-time').value = meeting.time;
                    if(meeting.location) document.getElementById('meeting-location').value = meeting.location;
                    if(meeting.summary) document.getElementById('meeting-summary').value = meeting.summary;
                    
                    // Participants
                    document.querySelectorAll('.participant-checkbox').forEach(cb => {
                        cb.checked = (meeting.participants || []).includes(cb.value);
                    });
                    
                    // Change Button State
                    const btn = document.getElementById('submit-meeting');
                    btn.innerHTML = '<i data-lucide="save" class="w-4 h-4 mr-2"></i> Actualizar Reunión';
                    createIcons();
                    
                    // Scroll to form (top)
                    document.getElementById('admin-panels-container').scrollIntoView({ behavior: 'smooth' });
                    showToast('Editando reunión...', 'info');
                }
            }
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

    // Admin: Add Manual User
    const addUserForm = document.getElementById('add-user-form');
    if(addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('add-user-name').value;
            const email = document.getElementById('add-user-email').value;
            const company = document.getElementById('add-user-company').value;
            const position = document.getElementById('add-user-position').value;
            const phone = document.getElementById('add-user-phone').value;
            
            try {
                await addUserProfile({ name, email, company, position, phone });
                showToast('Usuario añadido al directorio', 'success');
                addUserForm.reset();
                // Refresh? Directory subscription/fetch should handle it if one-time fetch re-runs or we manually fetch.
                // Current implementation is a one-time fetch in setOnLoginSuccess. We might need to manually update state.users.
                state.users = await fetchDirectory();
                refreshUI();
            } catch(error) {
                console.error(error);
                showToast('Error añadiendo usuario', 'error');
            }
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
                    
                    // Optimistic Update
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

import { createIcons } from 'lucide';

// --- Helper: Screen & Form Management ---

export const showAuthForm = (form) => {
    const authTitle = document.getElementById('auth-title');
    const formMap = {
        'login': { container: document.getElementById('login-form-container'), title: 'Iniciar Sesión' },
        'register': { container: document.getElementById('register-form-container'), title: 'Crear Cuenta' },
        'forgot': { container: document.getElementById('forgot-password-form-container'), title: 'Recuperar Contraseña' }
    };
    
    Object.values(formMap).forEach(f => f.container.classList.add('hidden'));
    const target = formMap[form];
    if (target) {
        authTitle.textContent = target.title;
        target.container.classList.remove('hidden');
        target.container.classList.add('form-fade-in');
        target.container.addEventListener('animationend', () => target.container.classList.remove('form-fade-in'), { once: true });
    }
}

export const showScreen = (screen) => {
    // console.log("Showing screen:", screen); // Debugging
    const loading = document.getElementById('loading-screen');
    const auth = document.getElementById('auth-container');
    const app = document.getElementById('app-screen');
    const profile = document.getElementById('profile-screen');

    // Reset all to hidden/none first
    if(loading) loading.style.display = 'none';
    
    // Auth Container handling
    if(auth) {
        if(['login', 'register', 'forgot'].includes(screen)) {
            auth.style.display = 'flex';
            auth.classList.remove('hidden');
        } else {
            auth.style.display = 'none';
            auth.classList.add('hidden');
        }
    }

    // App handling
    if(app) {
        if(screen === 'app') {
            app.style.display = 'block';
            app.classList.remove('hidden');
        } else {
            app.style.display = 'none';
            app.classList.add('hidden');
        }
    }

    // Profile handling
    if(profile) {
        if(screen === 'profile') {
            profile.style.display = 'block';
            profile.classList.remove('hidden');
        } else {
            profile.style.display = 'none';
            profile.classList.add('hidden');
        }
    }

    // Loading handling
    if(screen === 'loading' && loading) {
         loading.style.display = 'flex';
    }
    
    if (screen === 'login') showAuthForm('login');
    if (screen === 'register') showAuthForm('register');
    if (screen === 'forgot') showAuthForm('forgot');
}

// --- Renderers ---

export const renderHeader = (currentUser) => {
    if (!currentUser) return;
    const nameEl = document.querySelector('#user-info p:first-child');
    if (nameEl) nameEl.textContent = currentUser.name;
    
    const userEmailRoleEl = document.getElementById('user-email-role');
    if (userEmailRoleEl) {
        if (currentUser.role === 'pro') {
            userEmailRoleEl.textContent = `Pro | ${currentUser.contactRequestsLeft || 0} contactos restantes`;
        } else {
            userEmailRoleEl.textContent = currentUser.email;
        }
    }

    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.src = currentUser.photoURL || 'https://placehold.co/100';
    
    const upgradeBtn = document.getElementById('upgrade-to-pro-btn');
    if (upgradeBtn) {
        if(currentUser.role === 'socio7x7'){
            upgradeBtn.classList.remove('hidden');
        } else {
            upgradeBtn.classList.add('hidden');
        }
    }
}

export const renderAnnouncements = (announcements, currentUser) => {
    const list = document.getElementById('announcements-list');
    if (!list) return;
    list.innerHTML = '';
    
    const sorted = [...announcements].sort((a, b) => (b.isPinned === a.isPinned) ? 0 : b.isPinned ? 1 : -1);
    
    sorted.forEach(ann => {
        const annEl = document.createElement('div');
        annEl.className = `relative p-4 rounded-lg border ${ann.isPinned ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`;
        let adminActions = '';
        if (currentUser && currentUser.role === 'admin') {
            adminActions = `
                <div class="absolute top-2 right-2 flex space-x-1">
                    <button data-id="${ann.id}" class="toggle-pin-btn p-1 text-gray-500 hover:text-gray-800" title="${ann.isPinned ? 'Quitar Chincheta' : 'Fijar con Chincheta'}">
                        <i data-lucide="${ann.isPinned ? 'pin-off' : 'pin'}" class="w-4 h-4"></i>
                    </button>
                    <!-- Delete not implemented in this phase yet -->
                </div>
                `;
        }
        
        // Date format: Handle YYYY-MM-DD manually to avoid UTC shift
        let displayDate = ann.date; 
        try {
             if(ann.date.includes('T')) {
                 // It's ISO string (from created announcements), just show date part local
                 displayDate = new Date(ann.date).toLocaleDateString();
             } else {
                 // It's YYYY-MM-DD (from manual mocks?), parse as local
                 const [y, m, d] = ann.date.split('-');
                 displayDate = `${d}/${m}/${y}`;
             }
        } catch(e) {}


        annEl.innerHTML = `
            ${adminActions}
            <p class="text-gray-800 pr-12">${ann.text}</p>
            <div class="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>Por: ${ann.author || 'Admin'} - ${displayDate}</span>
                ${ann.isPinned ? `<span class="text-yellow-600 flex items-center"><i data-lucide="pin" class="w-4 h-4 mr-1"></i> Fijado</span>` : ''}
            </div>`;
        list.appendChild(annEl);
    });
    createIcons();
}

export const renderMeetings = (meetings, users, currentUser, showEditModal) => {
    const list = document.getElementById('meetings-list');
    if (!list) return;
    list.innerHTML = '';
    
    let userMeetings;
    if (currentUser.role === 'admin') {
        userMeetings = meetings;
    } else {
        // Filter logic: assume participants are stored as array of UIDs
        userMeetings = meetings.filter(m => m.participants && m.participants.includes(currentUser.id));
    }

    if (userMeetings.length === 0) {
        list.innerHTML = '<p class="text-gray-500">Aún no has participado en ninguna reunión registrada.</p>';
        return;
    }

    userMeetings.forEach(meeting => {
        const meetingEl = document.createElement('div');
        meetingEl.className = 'border-l-4 pl-4 relative';
        meetingEl.style.borderColor = '#4B5563';
        
        // Privacy Logic
        const isParticipant = meeting.participants && meeting.participants.includes(currentUser.id);
        const canSeeNotes = currentUser.role === 'admin' || isParticipant;
        const canSeeDetailedParticipants = currentUser.role === 'admin' || currentUser.role === 'pro';

        let participantsHTML = '';
        const pData = (meeting.participants || []).map(uid => users[uid]).filter(Boolean);

        if (pData.length > 0) {
            participantsHTML = `<h4 class="font-semibold mt-3 mb-2">Participantes:</h4>`;
            if (canSeeDetailedParticipants) {
                participantsHTML += `
                <ul class="list-disc list-inside text-sm space-y-1">
                    ${pData.map(p => `<li><strong>${p.name}</strong> (${p.position || ''}, ${p.company || ''})</li>`).join('')}
                </ul>`;
            } else {
                // Socio7x7 view: Names only, blurred details
                participantsHTML += `
                <ul class="list-disc list-inside text-sm space-y-1">
                    ${pData.map(p => `<li>${p.name} <span class="text-xs text-gray-400 italic">(Hazte Pro para ver detalles)</span></li>`).join('')}
                </ul>`;
            }
        }

        meetingEl.innerHTML = `
            ${adminActions}
            <h3 class="font-bold text-lg">${meeting.title}</h3>
            <p class="text-sm text-gray-500 mb-2">${dDate}</p>
            ${ canSeeNotes ? `<p class="text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">${meeting.summary || 'Sin resumen disponible.'}</p>` : `<p class="text-gray-400 italic text-sm">Resumen visible solo para participantes.</p>` }
            ${participantsHTML}`;
        list.appendChild(meetingEl);
    });
    createIcons();
    
    // Attach edit listeners
    if (showEditModal) {
        document.querySelectorAll('.edit-meeting-btn').forEach(btn => {
            btn.addEventListener('click', (e) => showEditModal(e.currentTarget.dataset.meetingId));
        });
    }
}

export const renderDirectory = (users, currentUser, searchTerm = '', unlockedContacts = {}) => {
    const list = document.getElementById('directory-list');
    if (!list) return;
    list.innerHTML = '';
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    Object.values(users).forEach(user => {
        if (!user.name) return;
        if (user.id === currentUser.id) return; // Don't show self? Optional.

        if (user.name.toLowerCase().includes(lowerCaseSearch) || (user.company && user.company.toLowerCase().includes(lowerCaseSearch))) {
            const card = document.createElement('div');
            card.className = 'p-4 border rounded-lg bg-white flex flex-col items-center text-center relative';
            
            const roleBadges = { socio7x7: '<span class="badge badge-socio7x7">Socio7x7</span>', pro: '<span class="badge badge-pro">Pro</span>', admin: '<span class="badge badge-admin">Admin</span>' };
            const roleHTML = user.role ? `<div class="mt-2">${roleBadges[user.role] || ''}</div>` : '';

            // Privacy / Reveal Logic
            let contactDetailsHTML = '';
            
            if (currentUser.role === 'admin') {
                // Admin sees all
                contactDetailsHTML = `
                    <div class="mt-3 text-sm text-gray-600 space-y-1">
                        <p>${user.email}</p>
                        <p>${user.phone || 'Sin teléfono'}</p>
                        <p class="font-medium text-gray-800">${user.company || ''}</p>
                        ${user.description ? `<p class="text-xs text-gray-500 mt-1 italic">"${user.description}"</p>` : ''}
                    </div>`;
            } else if (currentUser.role === 'pro') {
                // Pro Logic
                if (unlockedContacts[user.id]) {
                     // Unlocked
                     contactDetailsHTML = `
                    <div class="mt-3 text-sm text-gray-600 space-y-1 bg-green-50 p-2 rounded border border-green-100">
                        <p class="text-xs text-green-700 font-bold mb-1">¡Desbloqueado!</p>
                        <p>${user.email}</p>
                        <p>${user.phone || 'Sin teléfono'}</p>
                        <p class="font-medium text-gray-800">${user.company || ''}</p>
                        ${user.description ? `<p class="text-xs text-gray-500 mt-1 italic">"${user.description}"</p>` : ''}
                    </div>`;
                } else {
                    // Locked - Show Button
                    contactDetailsHTML = `
                    <div class="mt-4">
                        <button class="unlock-contact-btn btn bg-gray-800 text-white text-xs px-3 py-2 rounded hover:bg-gray-700 transition" data-uid="${user.id}" data-name="${user.name}">
                            <i data-lucide="lock" class="w-3 h-3 inline mr-1"></i>
                            Ver Datos (1 Crédito)
                        </button>
                    </div>`;
                }
            } else {
                // Socio7x7 Logic - Show "Locked" state but cleaner
                contactDetailsHTML = `
                    <div class="mt-4">
                         <a href="https://www.red7x7.cl/suscripcion" target="_blank" class="block w-full text-center py-2 px-3 rounded bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200 hover:bg-slate-200 transition-colors">
                            <i data-lucide="lock" class="w-3 h-3 inline mr-1"></i>
                             Datos solo para Pros
                        </a>
                    </div>`;
            }

            card.innerHTML = `
                <img src="${user.photoURL || 'https://placehold.co/100'}" class="w-16 h-16 rounded-full mb-3" alt="${user.name}">
                <h4 class="font-bold text-md">${user.name}</h4>
                <p class="text-sm text-gray-600">${user.position || ''}</p>
                ${roleHTML}
                ${contactDetailsHTML}
                
                ${(currentUser.role === 'admin') ? `
                <div class="mt-3 w-full border-t pt-2">
                    <label class="text-xs text-gray-500 block mb-1">Cambiar Rol:</label>
                    <select class="role-selector block w-full p-1 text-xs border rounded" data-uid="${user.id}">
                        <option value="socio7x7" ${user.role === 'socio7x7' ? 'selected' : ''}>Socio7x7</option>
                        <option value="pro" ${user.role === 'pro' ? 'selected' : ''}>Pro</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="disabled" ${user.role === 'disabled' ? 'selected' : ''}>Desactivado</option>
                    </select>
                </div>` : ''}`;
            
            list.appendChild(card);
        }
    });
    createIcons();
}

export const renderDashboardStats = (statsData, currentUser) => {
    // statsData: { announcementCount, upcomingMeetingsCount, userCount, contactRequestsLeft }
    const statsContainer = document.getElementById('dashboard-stats');
    if (!statsContainer) return;
    statsContainer.classList.remove('hidden');
    statsContainer.classList.add('grid');
    statsContainer.innerHTML = '';

    const stats = [
        { 
            title: 'Anuncios', 
            val: statsData.announcementCount || 0, 
            icon: 'megaphone', 
            color: 'bg-blue-100 text-blue-600' 
        },
        { 
            title: 'Próx. Reuniones', 
            val: statsData.upcomingMeetingsCount || 0, 
            icon: 'calendar', 
            color: 'bg-purple-100 text-purple-600' 
        }
    ];

    if (currentUser.role === 'pro') {
         stats.push({ 
            title: 'Contactos Restantes', 
            val: statsData.contactRequestsLeft || 0, 
            icon: 'user-plus', 
            color: (statsData.contactRequestsLeft > 0) ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600' 
        });
    } else if (currentUser.role === 'admin') {
         stats.push({ 
            title: 'Total Usuarios', 
            val: statsData.userCount || 0, 
            icon: 'users', 
            color: 'bg-indigo-100 text-indigo-600' 
        });
    } else {
         stats.push({ 
            title: 'Networking', 
            val: 'Básico', 
            icon: 'star', 
            color: 'bg-gray-100 text-gray-600' 
        });
    }

    stats.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex items-center space-x-4';
        card.innerHTML = `
            <div class="p-3 rounded-full ${stat.color}">
                <i data-lucide="${stat.icon}" class="w-6 h-6"></i>
            </div>
            <div>
                <p class="text-sm text-gray-500 font-medium">${stat.title}</p>
                <p class="text-2xl font-bold text-gray-800">${stat.val}</p>
            </div>
        `;
        statsContainer.appendChild(card);
    });
    createIcons();
};

export const renderAdminPanels = (currentUser, users = {}) => {
    const adminPanels = document.getElementById('admin-panels-container');
    const meetingPanel = document.getElementById('admin-meeting-panel');
    if (currentUser && currentUser.role === 'admin') {
        adminPanels.classList.remove('hidden');
        meetingPanel.classList.remove('hidden');
        
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('meeting-date');
        if(dateInput) dateInput.value = today;
  
        // Render checkboxes with USERS
        const participantsList = document.getElementById('meeting-participants-list');
        if (participantsList) {
            participantsList.innerHTML = '';
            Object.values(users).forEach(user => {
                participantsList.innerHTML += `
                    <label class="flex items-center space-x-2">
                        <input type="checkbox" class="participant-checkbox h-4 w-4 border-gray-300 rounded" style="color: #4B5563;" value="${user.id}">
                        <span>${user.name} (${user.company || 'N/A'})</span>
                    </label>`;
            });
        }
    } else {
        if(adminPanels) adminPanels.classList.add('hidden');
        if(meetingPanel) meetingPanel.classList.add('hidden');
    }
};

export const renderProfileForm = (currentUser) => {
    if(!currentUser) return;
    const fields = ['profile-name', 'profile-email', 'profile-company', 'profile-position', 'profile-phone', 'profile-description'];
    const values = [currentUser.name, currentUser.email, currentUser.company, currentUser.position, currentUser.phone, currentUser.description];
    
    fields.forEach((id, idx) => {
        const el = document.getElementById(id);
        if(el) el.value = values[idx] || '';
    });

    // ... Upgrade section logic maintained ...
};

export const initializeAppUI = (currentUser) => {
    if (!currentUser) { showScreen('login'); return; }
    document.getElementById('whatsapp-button').classList.remove('hidden');
    renderHeader(currentUser);
    // Data independent renders.
    // Data dependent renders must be called by main.js logic upon data arrival.
    showScreen('app');
}

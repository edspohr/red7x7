import { createIcons } from "lucide";
import { deleteUser } from "./data.js";

// --- Helper: Normalize Role Check ---
const isAdmin = (user) => user?.role?.toLowerCase().trim() === "admin";
const isPro = (user) => user?.role?.toLowerCase().trim() === "pro";
const isSocio = (user) => user?.role?.toLowerCase().trim() === "socio7x7";

// --- Helper: Safe Icon Refresh ---
const refreshIcons = () => {
  try {
    if (window.lucide && window.lucide.createIcons && window.lucide.icons) {
      window.lucide.createIcons({ icons: window.lucide.icons });
    }
  } catch (e) {
    console.warn("Icon refresh failed:", e);
  }
};

// --- Helper: Avatar with Initials Fallback ---
const getAvatarUrl = (user) => {
  if (user?.photoURL) return user.photoURL;
  const name = user?.name || "User";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  // Using UI Avatars service for nice initials avatars
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    initials
  )}&background=4B5563&color=fff&size=100&bold=true`;
};

// --- Helper: Screen & Form Management ---

export const showAuthForm = (form) => {
  const authTitle = document.getElementById("auth-title");
  const formMap = {
    login: {
      container: document.getElementById("login-form-container"),
      title: "Iniciar Sesión",
    },
    register: {
      container: document.getElementById("register-form-container"),
      title: "Crear Cuenta",
    },
    forgot: {
      container: document.getElementById("forgot-password-form-container"),
      title: "Recuperar Contraseña",
    },
  };

  Object.values(formMap).forEach((f) => f.container.classList.add("hidden"));
  const target = formMap[form];
  if (target) {
    authTitle.textContent = target.title;
    target.container.classList.remove("hidden");
    target.container.classList.add("form-fade-in");
    target.container.addEventListener(
      "animationend",
      () => target.container.classList.remove("form-fade-in"),
      { once: true }
    );
  }
};

export const showScreen = (screen) => {
  const screens = [
    "loading-screen",
    "auth-container",
    "app-screen",
    "profile-screen",
  ];

  // Hide all screens first with exit animation
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.classList.contains("hidden")) {
      // Verify if it's the one we are showing, if so, skip (or optimize)
      // For simplicity: Hide instantly or fade out?
      // Let's do simple: Hide all, then Fade In the target.
      el.style.display = "none";
      el.classList.add("hidden");
      el.classList.remove("screen-enter");
    }
  });

  // Identify Target
  let targetId = "";
  if (screen === "loading") targetId = "loading-screen";
  else if (["login", "register", "forgot"].includes(screen))
    targetId = "auth-container";
  else if (screen === "app") targetId = "app-screen";
  else if (screen === "profile") targetId = "profile-screen";

  const target = document.getElementById(targetId);
  if (target) {
    target.style.display =
      targetId === "auth-container" || targetId === "loading-screen"
        ? "flex"
        : "block";
    target.classList.remove("hidden");
    target.classList.add("screen-enter");

    // Cleanup animation class
    target.addEventListener(
      "animationend",
      () => {
        target.classList.remove("screen-enter");
      },
      { once: true }
    );
  }

  if (screen === "login") showAuthForm("login");
  if (screen === "register") showAuthForm("register");
  if (screen === "forgot") showAuthForm("forgot");
};

// --- Renderers ---

export const renderHeader = (currentUser) => {
  if (!currentUser) return;
  const nameEl = document.querySelector("#user-info p:first-child");
  if (nameEl) nameEl.textContent = currentUser.name;

  const userEmailRoleEl = document.getElementById("user-email-role");
  if (userEmailRoleEl) {
    // Clear previous content
    userEmailRoleEl.innerHTML = "";

    // Create Badge with normalized role
    const badge = document.createElement("span");
    const normalizedRole = isAdmin(currentUser)
      ? "admin"
      : isPro(currentUser)
      ? "pro"
      : "socio7x7";
    badge.className = `badge badge-${normalizedRole} mr-2`;
    badge.textContent = isSocio(currentUser)
      ? "Socio7x7"
      : isPro(currentUser)
      ? "Pro"
      : isAdmin(currentUser)
      ? "Admin"
      : currentUser.role;
    userEmailRoleEl.appendChild(badge);

    // Add Email or extra info text node
    const infoText = document.createTextNode(
      isPro(currentUser)
        ? `${currentUser.email} | ${
            currentUser.contactRequestsLeft || 0
          } créditos`
        : currentUser.email
    );
    userEmailRoleEl.appendChild(infoText);
  }

  const upgradeBtn = document.getElementById("upgrade-to-pro-btn");
  if (upgradeBtn) {
    if (isSocio(currentUser)) {
      upgradeBtn.style.display = "inline-flex"; // Use flex for icon alignment
      upgradeBtn.classList.remove("hidden");
    } else {
      upgradeBtn.style.display = "none";
      upgradeBtn.classList.add("hidden");
    }
  }

  // Refresh icons in header if they were just rendered/hidden
  if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });
};

export const renderAnnouncements = (announcements, currentUser) => {
  const list = document.getElementById("announcements-list");
  if (!list) return;
  list.innerHTML = "";

  const sorted = [...announcements].sort((a, b) =>
    b.isPinned === a.isPinned ? 0 : b.isPinned ? 1 : -1
  );

  if (sorted.length === 0) {
    list.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-center">
            <div class="bg-indigo-50 p-4 rounded-full mb-3">
                <i data-lucide="bell-off" class="w-8 h-8 text-indigo-300"></i>
            </div>
            <p class="text-slate-500 font-medium">No hay anuncios publicados por el momento.</p>
        </div>`;
    if (window.lucide) refreshIcons();
    return;
  }

  sorted.forEach((ann) => {
    const annEl = document.createElement("div");
    annEl.className = `relative p-4 rounded-lg border ${
      ann.isPinned
        ? "bg-yellow-50 border-yellow-300"
        : "bg-gray-50 border-gray-200"
    }`;
    let adminActions = "";
    if (currentUser && isAdmin(currentUser)) {
      adminActions = `
                <div class="absolute top-2 right-2 flex space-x-1">
                    <button data-id="${
                      ann.id
                    }" class="toggle-pin-btn p-1 text-gray-500 hover:text-gray-800" title="${
        ann.isPinned ? "Quitar Chincheta" : "Fijar con Chincheta"
      }">
                        <i data-lucide="${
                          ann.isPinned ? "pin-off" : "pin"
                        }" class="w-4 h-4"></i>
                    </button>
                    <button data-id="${
                      ann.id
                    }" class="delete-ann-btn p-1 text-red-400 hover:text-red-700" title="Eliminar Anuncio">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
                `;
    }

    // Date format: Handle YYYY-MM-DD manually to avoid UTC shift
    let displayDate = ann.date;
    try {
      if (ann.date.includes("T")) {
        // It's ISO string (from created announcements), just show date part local
        displayDate = new Date(ann.date).toLocaleDateString();
      } else {
        // It's YYYY-MM-DD (from manual mocks?), parse as local
        const [y, m, d] = ann.date.split("-");
        displayDate = `${d}/${m}/${y}`;
      }
    } catch (e) {}

    annEl.innerHTML = `
            ${adminActions}
            <h3 class="font-bold text-lg mb-1">${ann.text}</h3>
            <p class="text-xs text-gray-500 text-right">${displayDate}</p>
        `;
    list.appendChild(annEl);
  });
  // Create icons for the pinned/unpinned buttons
  if (window.lucide) refreshIcons();
};

// --- Helpers ---
const parseMarkdown = (text) => {
  if (!text) return "";
  let html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
    .replace(/\n/g, "<br>"); // Line breaks

  // Simple list support (lines starting with - )
  if (html.includes("- ")) {
    html = html.replace(/<br>- (.*?)(?=<br>|$)/g, "<li>$1</li>");
    // Wrap contiguous lis in ul? simplified: just styling items as list-like
    // Better: just replace - with bullet point char for simplicity if not full parsing
    html = html.replace(/- /g, "• ");
  }
  return html;
};

const getGoogleCalendarUrl = (meeting) => {
  // Format dates YYYYMMDDTHHMMSSZ
  // Simple assumption: date is YYYY-MM-DD, time is HH:MM
  // Default duration 1 hour if not specified
  if (!meeting.date) return "#";
  const dateStr = meeting.date.replace(/-/g, "");
  const timeStr = (meeting.time || "10:00").replace(/:/g, "") + "00";
  const start = `${dateStr}T${timeStr}`;
  // End time +1h
  let h = parseInt(meeting.time ? meeting.time.split(":")[0] : 10) + 1;
  const endStr =
    (h < 10 ? "0" + h : h) +
    (meeting.time ? meeting.time.split(":")[1] : "00") +
    "00";
  const end = `${dateStr}T${endStr}`;

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    meeting.title
  )}&dates=${start}/${end}&details=${encodeURIComponent(
    meeting.summary || ""
  )}&location=${encodeURIComponent(meeting.location || "")}&sf=true&output=xml`;
};

// Helper to detect URL (simple)
const linkify = (text) => {
  if (!text) return "";
  // Regex for URL
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(
    urlRegex,
    (url) =>
      `<a href="${url}" target="_blank" class="text-indigo-600 hover:underline break-all">${url}</a>`
  );
};

export const renderMeetings = (
  meetings,
  users,
  currentUser,
  showEditModal,
  activeTab = "upcoming"
) => {
  const list = document.getElementById("meetings-list");
  if (!list) return;
  list.innerHTML = "";

  // Filter by Tab
  const now = new Date();

  let filtered = meetings.filter((m) => {
    const mDate = new Date(m.date + "T23:59:59");
    return activeTab === "upcoming" ? mDate >= now : mDate < now;
  });

  const sorted = [...filtered].sort((a, b) => {
    return activeTab === "upcoming"
      ? new Date(a.date) - new Date(b.date)
      : new Date(b.date) - new Date(a.date);
  });

  if (sorted.length === 0) {
    list.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-center">
            <div class="bg-indigo-50 p-4 rounded-full mb-3">
                <i data-lucide="calendar-off" class="w-8 h-8 text-indigo-300"></i>
            </div>
            <p class="text-slate-500 font-medium">No hay reuniones ${
              activeTab === "upcoming" ? "programadas" : "pasadas"
            }.</p>
            ${
              activeTab === "upcoming"
                ? '<p class="text-xs text-slate-400 mt-1">¡Mantente atento a nuevas convocatorias!</p>'
                : ""
            }
        </div>`;
    if (window.lucide) refreshIcons();
    return;
  }

  sorted.forEach((meeting) => {
    // Filter: Current user must be in participants OR admin
    const isParticipant = (meeting.participants || []).includes(
      currentUser.uid || currentUser.id
    );
    const isAdminUser = isAdmin(currentUser);

    if (!isParticipant && !isAdminUser) return; // Hide if not involved

    const meetingEl = document.createElement("div");
    meetingEl.className =
      "bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 transition-all hover:shadow-md hover:border-indigo-100 group";

    // Admin Actions
    let adminActions = "";
    if (isAdminUser) {
      adminActions = `
            <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <button data-id="${meeting.id}" class="edit-meeting-btn p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                </button>
            </div>`;
    }

    // Participants Logic
    let participantsHTML = "";
    const pData = (meeting.participants || [])
      .map((uid) => users[uid])
      .filter(Boolean);

    if (pData.length > 0) {
      // NEW: Show contact details in meeting card
      participantsHTML = `
            <div class="mt-6 pt-5 border-t border-slate-100">
                <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Participantes (Tu Red)</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${pData
                      .map(
                        (p) => `
                        <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                            <div class="h-10 w-10 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                                ${p.name.charAt(0)}
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-bold text-slate-900 truncate">${
                                  p.name
                                }</p>
                                <p class="text-xs text-indigo-600 font-medium truncate mb-1">${
                                  p.company || "Sin Empresa"
                                }</p>
                                
                                <div class="space-y-0.5">
                                  <div class="flex items-center text-xs text-slate-600">
                                      <i data-lucide="mail" class="w-3 h-3 mr-1.5 text-slate-400"></i>
                                      <span class="truncate select-all">${
                                        p.email
                                      }</span>
                                  </div>
                                  ${
                                    p.phone
                                      ? `
                                  <div class="flex items-center text-xs text-slate-600">
                                      <i data-lucide="phone" class="w-3 h-3 mr-1.5 text-slate-400"></i>
                                      <span class="select-all">${p.phone}</span>
                                  </div>`
                                      : ""
                                  }
                                </div>
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>`;
    }

    // Date format logic
    let dDate = meeting.date;
    try {
      if (meeting.date.includes("T"))
        dDate = new Date(meeting.date).toLocaleDateString();
      else {
        const [y, m, d] = meeting.date.split("-");
        dDate = `${d}/${m}/${y}`;
      }
    } catch (e) {}

    // Summary Markdown parsing
    const summaryHTML = parseMarkdown(meeting.summary);

    // Location Linkify
    const locationHTML = linkify(meeting.location);

    meetingEl.innerHTML = `
            <div class="relative">
                ${adminActions}
                <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div class="flex-1">
                         <div class="flex items-center gap-2 mb-2">
                             <span class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                                <i data-lucide="calendar" class="w-3 h-3 mr-1"></i> ${dDate}
                             </span>
                             ${
                               meeting.time
                                 ? `
                             <span class="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                <i data-lucide="clock" class="w-3 h-3 mr-1"></i> ${meeting.time}
                             </span>`
                                 : ""
                             }
                         </div>
                         
                         <div class="flex items-center gap-2 group-title">
                            <h3 class="text-xl font-bold text-slate-900 font-heading">${
                              meeting.title
                            }</h3>
                            <button class="copy-details-btn p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded transition-colors" title="Copiar detalles" 
                                data-text="${meeting.title} - ${dDate} ${
      meeting.time || ""
    } @ ${meeting.location || ""}">
                                <i data-lucide="copy" class="w-4 h-4"></i>
                            </button>
                         </div>
                         
                         <div class="mt-2 flex items-center text-sm text-slate-500">
                            <i data-lucide="map-pin" class="w-4 h-4 mr-1.5 text-slate-400"></i>
                            ${
                              meeting.location
                                ? `<span class="break-all">${locationHTML}</span>`
                                : "Ubicación por definir"
                            }
                         </div>
                    </div>
                    
                    ${
                      activeTab === "upcoming"
                        ? `
                    <div class="mt-4 md:mt-0 w-full md:w-auto">
                        <a href="${getGoogleCalendarUrl(
                          meeting
                        )}" target="_blank" class="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:bg-slate-800 transition-all active:scale-95">
                            <i data-lucide="calendar-plus" class="w-4 h-4"></i> Agendar
                        </a>
                    </div>`
                        : ""
                    }
                </div>
                
                <div class="mt-6">
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bitácora / Resumen</h4>
                    <div class="prose prose-sm prose-slate text-slate-600 bg-slate-50 p-5 rounded-xl border border-slate-100/50">
                        ${
                          summaryHTML ||
                          '<em class="text-slate-400">Sin resumen disponible.</em>'
                        }
                    </div>
                </div>
                
                ${participantsHTML}
            </div>
            `;
    list.appendChild(meetingEl);
  });
  // Create icons
  if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });

  // Attach listeners
  if (showEditModal) {
    document.querySelectorAll(".edit-meeting-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        showEditModal(e.currentTarget.dataset.id)
      );
    });
  }

  // Copy Listener
  document.querySelectorAll(".copy-details-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const text = e.currentTarget.dataset.text;
      navigator.clipboard.writeText(text).then(() => {
        e.currentTarget.classList.add("text-green-600");
        setTimeout(
          () => e.currentTarget.classList.remove("text-green-600"),
          1000
        );
      });
    });
  });
};

export const renderDirectory = (
  users,
  currentUser,
  searchTerm = "",
  peopleMetSet = new Set()
) => {
  const list = document.getElementById("directory-list");
  if (!list) return;
  list.innerHTML = "";

  // Headcount
  const countEl = document.createElement("div");
  countEl.className =
    "w-full text-center text-gray-500 mb-4 text-sm col-span-full";
  const totalUsers = Object.values(users).length;
  const matchCount = Object.values(users).filter(
    (u) => u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).length;
  countEl.innerHTML = `<span class="font-bold">${matchCount}</span> miembros encontrados ${
    searchTerm ? "(filtrado)" : `de ${totalUsers}`
  }`;
  list.appendChild(countEl);

  if (matchCount === 0) {
    const emptyData = document.createElement("div");
    emptyData.className =
      "col-span-full flex flex-col items-center justify-center py-12 text-center bg-white/50 border border-dashed border-slate-300 rounded-2xl";
    emptyData.innerHTML = `
        <div class="bg-slate-50 p-4 rounded-full mb-3">
            <i data-lucide="search-x" class="w-8 h-8 text-slate-400"></i>
        </div>
        <p class="text-slate-500 font-medium">No se encontraron miembros.</p>
        <p class="text-xs text-slate-400 mt-1">Intenta con otro término de búsqueda.</p>
    `;
    list.appendChild(emptyData);
    if (window.lucide) refreshIcons();
    return;
  }

  const lowerCaseSearch = searchTerm.toLowerCase();

  // Sort Alphabetically
  const sortedUsers = Object.values(users).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );

  sortedUsers.forEach((user) => {
    if (!user.name) return;

    if (
      user.name.toLowerCase().includes(lowerCaseSearch) ||
      (user.company && user.company.toLowerCase().includes(lowerCaseSearch))
    ) {
      const card = document.createElement("div");
      card.className =
        "p-6 border border-slate-100 rounded-2xl bg-white flex flex-col relative transition-all duration-300 hover:shadow-lg hover:border-indigo-100 hover:-translate-y-1 group";

      // Calculate Visibility
      // 1. Admin sees everything
      // 2. You see yourself
      // 3. You see people you've met (in peopleMetSet)
      const isAdminUser = isAdmin(currentUser);
      const isSelf = user.id === currentUser.id;
      const hasMet = peopleMetSet.has(user.id);
      // const canViewDetails = isAdminUser || isSelf || hasMet; // Removed to avoid duplication

      const roleBadges = {
        socio7x7: '<span class="badge badge-socio7x7">Socio7x7</span>',
        pro: '<span class="badge badge-pro">Pro Member</span>',
        admin: '<span class="badge badge-admin">Admin</span>',
      };

      const roleHTML = user.role
        ? `<div class="absolute top-5 right-5">${
            roleBadges[user.role] || ""
          }</div>`
        : "";

      // Contact Details Logic
      let contactDetailsHTML = "";

      // STRICT PRIVACY RULES
      // 1. Admin: Sees everything
      // 2. Self: Sees own data
      // 3. Pro: Sees check "unlockedContacts" logic (hasMet)
      // 4. Socio7x7: Sees names/company but NO contact info unless it's their own

      const canViewDetails =
        isAdminUser || isSelf || (isPro(currentUser) && hasMet);

      if (canViewDetails) {
        contactDetailsHTML = `
            <div class="mt-5 pt-4 border-t border-slate-50 text-sm space-y-2.5">
                ${
                  hasMet && !isSelf && !isAdminUser
                    ? `<div class="mb-3 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg inline-flex items-center">
                        <i data-lucide="users" class="w-3.5 h-3.5 mr-1.5"></i> Conectados en Reunión
                       </div>`
                    : ""
                }
                <div class="flex items-center text-slate-700 group-hover:text-slate-900 transition-colors">
                    <div class="w-8 flex justify-center"><i data-lucide="mail" class="w-4 h-4 text-slate-400"></i></div>
                    <span class="truncate select-all cursor-text">${
                      user.email
                    }</span>
                </div>
                <div class="flex items-center text-slate-700 group-hover:text-slate-900 transition-colors">
                    <div class="w-8 flex justify-center"><i data-lucide="phone" class="w-4 h-4 text-slate-400"></i></div>
                    <span class="select-all cursor-text">${
                      user.phone || "Sin teléfono"
                    }</span>
                </div>
                
                ${
                  user.description
                    ? `<p class="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-50 italic leading-relaxed">"${user.description}"</p>`
                    : ""
                }
            </div>`;
      } else {
        // Locked State
        let lockedMessage = "Hazte Pro para ver datos";
        if (isSocio(currentUser)) lockedMessage = "Plan Socio: Vista limitada";

        contactDetailsHTML = `
            <div class="mt-auto pt-8 pb-2 text-center">
                 <div class="inline-flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-100 w-full group-hover:bg-slate-100/50 transition-colors">
                    <i data-lucide="lock" class="w-5 h-5 text-slate-300 mb-2"></i>
                    <p class="text-xs text-slate-400 font-medium">${lockedMessage}</p>
                 </div>
            </div>`;
      }

      // Initial Avatar/Name Section
      const initial = user.name.charAt(0).toUpperCase();

      card.innerHTML = `
                <div class="flex items-start gap-4 mb-2">
                    <div class="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-200 shadow-md flex items-center justify-center text-white text-lg font-bold shrink-0">
                        ${initial}
                    </div>
                    <div class="min-w-0 flex-1 pt-0.5">
                        <h4 class="font-bold text-lg text-slate-900 font-heading leading-tight truncate pr-16">${
                          user.name
                        }</h4>
                        <p class="text-sm text-slate-500 font-medium truncate">${
                          user.position || "Miembro"
                        }</p>
                        <p class="text-xs text-indigo-600 font-bold tracking-wide uppercase mt-1 truncate">${
                          user.company || ""
                        }</p>
                    </div>
                </div>
                
                ${roleHTML}
                ${contactDetailsHTML}
                
                ${
                  isAdminUser
                    ? `
                <div class="mt-4 pt-3 border-t border-slate-100 opacity-40 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <select class="role-selector block w-full py-1 px-2 text-[10px] uppercase font-bold border border-slate-200 rounded-lg bg-slate-50 focus:ring-0 focus:border-indigo-300 cursor-pointer" data-uid="${
                      user.id
                    }">
                        <option value="socio7x7" ${
                          user.role === "socio7x7" ? "selected" : ""
                        }>Rol: Socio7x7</option>
                        <option value="pro" ${
                          user.role === "pro" ? "selected" : ""
                        }>Rol: Pro</option>
                        <option value="admin" ${
                          user.role === "admin" ? "selected" : ""
                        }>Rol: Admin</option>
                        <option value="disabled" ${
                          user.role === "disabled" ? "selected" : ""
                        }>Rol: Desactivado</option>
                    </select>
                    <button class="delete-user-btn p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors" data-uid="${
                      user.id
                    }" title="Eliminar Usuario">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>`
                    : ""
                }`;

      list.appendChild(card);
    }
  });
  refreshIcons();
};

export const renderDashboardStats = (statsData, currentUser) => {
  // statsData: { announcementCount, upcomingMeetingsCount, userCount, contactRequestsLeft, meetingsAttended, peopleMet }
  const statsContainer = document.getElementById("dashboard-stats");
  if (!statsContainer) return;
  statsContainer.classList.remove("hidden");
  statsContainer.classList.add("grid");
  statsContainer.innerHTML = "";

  const stats = [];

  // Common/Admin Stats
  if (isAdmin(currentUser)) {
    stats.push({
      title: "Total Usuarios",
      val: statsData.userCount || 0,
      icon: "users",
      color: "bg-indigo-100 text-indigo-600",
    });
    stats.push({
      title: "Anuncios",
      val: statsData.announcementCount || 0,
      icon: "megaphone",
      color: "bg-blue-100 text-blue-600",
    });
    stats.push({
      title: "Próx. Reuniones",
      val: statsData.upcomingMeetingsCount || 0,
      icon: "calendar",
      color: "bg-purple-100 text-purple-600",
    });
  } else {
    // User/Pro Stats - Focused on Networking as requested
    stats.push({
      title: "Reuniones Asistidas",
      val: statsData.meetingsAttended || 0,
      icon: "users",
      color: "bg-indigo-100 text-indigo-600",
    });
    stats.push({
      title: "Personas Conocidas",
      val: statsData.peopleMet || 0,
      icon: "user-check",
      color: "bg-emerald-100 text-emerald-600",
    });

    if (isPro(currentUser)) {
      stats.push({
        title: "Créditos Restantes",
        val: statsData.contactRequestsLeft || 0,
        icon: "lock-open",
        color:
          statsData.contactRequestsLeft > 0
            ? "bg-blue-100 text-blue-600"
            : "bg-red-100 text-red-600",
      });
    }
  }

  stats.forEach((stat) => {
    const card = document.createElement("div");
    // Redesigned Stat Card
    card.className =
      "bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-5 hover:border-indigo-100 transition-colors cursor-default";
    card.innerHTML = `
            <div class="p-4 rounded-xl ${stat.color} bg-opacity-10 ring-1 ring-inset ring-black/5">
                <i data-lucide="${stat.icon}" class="w-7 h-7"></i>
            </div>
            <div>
                <p class="text-3xl font-bold text-slate-800 tracking-tight font-heading">${stat.val}</p>
                <p class="text-sm text-slate-500 font-medium uppercase tracking-wide mt-0.5">${stat.title}</p>
            </div>
        `;
    statsContainer.appendChild(card);
  });
  refreshIcons();
};

export const renderAdminPanels = (currentUser, users = {}) => {
  const adminPanels = document.getElementById("admin-panels-container");
  const meetingPanel = document.getElementById("admin-meeting-panel");
  if (currentUser && isAdmin(currentUser)) {
    if (adminPanels) {
      adminPanels.style.display = "block";
      adminPanels.classList.remove("hidden");
    }
    if (meetingPanel) {
      meetingPanel.style.display = "block";
      meetingPanel.classList.remove("hidden");
    }

    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("meeting-date");
    if (dateInput) dateInput.value = today;

    // Render checkboxes with USERS
    const participantsList = document.getElementById(
      "meeting-participants-list"
    );
    if (participantsList) {
      participantsList.innerHTML = "";
      // Sort Alphabetically
      const sortedUsers = Object.values(users).sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );

      sortedUsers.forEach((user) => {
        participantsList.innerHTML += `
                    <label class="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                        <input type="checkbox" class="participant-checkbox h-4 w-4 border-gray-300 rounded" style="color: #4B5563;" value="${
                          user.id
                        }">
                        <span class="text-sm">${user.name} (${
          user.company || "N/A"
        })</span>
                    </label>`;
      });
    }
  } else {
    if (adminPanels) {
      adminPanels.style.display = "none";
      adminPanels.classList.add("hidden");
    }
    if (meetingPanel) {
      meetingPanel.style.display = "none";
      meetingPanel.classList.add("hidden");
    }
  }
};

export const renderProfileForm = (currentUser) => {
  if (!currentUser) return;
  const fields = [
    "profile-name",
    "profile-email",
    "profile-company",
    "profile-position",
    "profile-phone",
    "profile-description",
  ];
  const values = [
    currentUser.name,
    currentUser.email,
    currentUser.company,
    currentUser.position,
    currentUser.phone,
    currentUser.description,
  ];

  fields.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) el.value = values[idx] || "";
  });

  // ... Upgrade section logic maintained ...
};

export const initializeAppUI = (currentUser) => {
  if (!currentUser) {
    showScreen("login");
    return;
  }
  document.getElementById("whatsapp-button").classList.remove("hidden");
  renderHeader(currentUser);
  // Data independent renders.
  // Data dependent renders must be called by main.js logic upon data arrival.
  showScreen("app");
};

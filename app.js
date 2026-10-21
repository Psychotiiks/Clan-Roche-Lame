// --- URL WEBAPP & VARIABLES GLOBALES ---
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzHmNh6wEEMGNfylskirp6jstABo2fzeGqkHLx7bTFpdUhE4ulD7Vzp-Xpnkss4nVKl/exec";

let currentUser = JSON.parse(localStorage.getItem('skyrim_current_user')) || null;
let membersList = JSON.parse(localStorage.getItem('skyrim_members')) || [];
let activityLogs = JSON.parse(localStorage.getItem('skyrim_activity_logs')) || [];
let gemsStock = JSON.parse(localStorage.getItem('skyrim_gems_stock')) || [
    { name: "Gemme insignifiante", state: "Vide", qty: 5 },
    { name: "Gemme commune", state: "Pleine", qty: 2 }
];

// --- NAVIGATION PAR ONGLETS ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = document.getElementById(`tab-${btn.dataset.tab}`);
        if (targetTab) targetTab.classList.add('active');
    });
});

// --- CONNEXION DISCORD OAUTH2 ---
const DISCORD_OAUTH_URL = "https://discord.com/oauth2/authorize?client_id=1562350704058961990&response_type=code&redirect_uri=https%3A%2F%2Fpsychotiiks.github.io%2FClan-Roche-Lame%2F&scope=identify";

document.getElementById('discord-login-btn')?.addEventListener('click', () => {
    window.location.href = DISCORD_OAUTH_URL;
});

// --- INITIALISATION AU CHARGEMENT DE LA PAGE ---
document.addEventListener('DOMContentLoaded', () => {
    renderActivityLog();
    renderMembers();
    renderGemsStock();

    if (currentUser) {
        updateUserUI();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        window.history.replaceState({}, document.title, window.location.pathname);
        if (!currentUser) {
            document.getElementById('registration-modal')?.classList.remove('hidden');
        }
    }
});

// --- FORMULAIRE D'INSCRIPTION RP ---
document.getElementById('registration-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const rpName = document.getElementById('rp-name').value.trim();
    const rpJob = document.getElementById('rp-job').value;

    if (!rpName) return;

    currentUser = {
        rpName: rpName,
        job: rpJob,
        joinedAt: new Date().toLocaleDateString('fr-FR')
    };

    localStorage.setItem('skyrim_current_user', JSON.stringify(currentUser));

    membersList.push(currentUser);
    localStorage.setItem('skyrim_members', JSON.stringify(membersList));

    document.getElementById('registration-modal')?.classList.add('hidden');

    updateUserUI();
    renderMembers();

    logActivity("Inscription", `${rpName} a rejoint le clan en tant que${rpJob}.`);

    syncWithGoogleSheets({
        action: "register_member",
        rpName: rpName,
        job: rpJob,
        date: currentUser.joinedAt
    });
});

// --- MISE À JOUR DE L'INTERFACE UTILISATEUR & DES RÔLES ---
function updateUserUI() {
    if (!currentUser) return;

    const loginBtn = document.getElementById('discord-login-btn');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');

    if (loginBtn) loginBtn.classList.add('hidden');
    if (userProfile) userProfile.classList.remove('hidden');
    if (userName) userName.textContent = `${currentUser.rpName} (${currentUser.job})`;

    // Affichage des boutons autorisés selon le métier
    document.querySelectorAll('.role-restricted').forEach(btn => {
        const requiredRole = btn.getAttribute('data-role');
        if (requiredRole && currentUser.job === requiredRole) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    });
}

// --- AFFICHAGE DES MEMBRES ---
function renderMembers() {
    const tbody = document.getElementById('members-list');
    if (!tbody) return;

    if (membersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Aucun membre inscrit pour le moment.</td></tr>`;
        return;
    }

    tbody.innerHTML = `
        <thead>
            <tr>
                <th>Nom RP</th>
                <th>Rôle / Métier</th>
                <th>Date d'inscription</th>
            </tr>
        </thead>
        <tbody>
        ${membersList.map(m => `
            <tr>
                <td><strong>${m.rpName}</strong></td>
                <td><span class="role-badge">${m.job}</span></td>
                <td>${m.joinedAt || '-'}</td>
            </tr>
        `).join('')}
        </tbody>
    `;
}

// --- JOURNAL DE BORD ---
function logActivity(category, actionText) {
    const author = currentUser ? currentUser.rpName : "Anonyme";
    const dateStr = new Date().toLocaleDateString('fr-FR') + " " + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    activityLogs.unshift({ date: dateStr, author: author, category: category, action: actionText });
    if (activityLogs.length > 100) activityLogs.pop();
    
    localStorage.setItem('skyrim_activity_logs', JSON.stringify(activityLogs));
    renderActivityLog();

    // Synchronisation Google Sheets
    syncWithGoogleSheets({
        author: author,
        category: category,
        actionText: actionText
    });
}

function renderActivityLog() {
    const tbody = document.getElementById('activity-log-body');
    if (!tbody) return;

    if (activityLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Aucune activité enregistrée.</td></tr>`;
        return;
    }

    tbody.innerHTML = activityLogs.map(log => `
        <tr>
            <td>${log.date}</td>
            <td><strong>${log.author}</strong></td>
            <td><span class="role-badge">${log.category}</span></td>
            <td>${log.action}</td>
        </tr>
    `).join('');
}

// --- FERMETURE DES MODALES ---
document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetModalId = btn.getAttribute('data-target');
        if (targetModalId) {
            document.getElementById(targetModalId)?.classList.add('hidden');
        }
    });
});

// --- GESTION DU STOCK DE GEMMES (ENCHANTEMENT) ---
function renderGemsStock() {
    const tbody = document.getElementById('gems-unified-body');
    if (!tbody) return;

    if (gemsStock.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Aucune gemme enregistrée dans le stock.</td></tr>`;
        return;
    }

    tbody.innerHTML = gemsStock.map(g => `
        <tr>
            <td><strong>${g.name}</strong></td>
            <td><span class="role-badge" style="color: ${g.state === 'Pleine' ? '#ffd700

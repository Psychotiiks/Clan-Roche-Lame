// URL WebApp Google Sheets
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzHmNh6wEEMGNfylskirp6jstABo2fzeGqkHLx7bTFpdUhE4ulD7Vzp-Xpnkss4nVKl/exec";

let currentUser = JSON.parse(localStorage.getItem('skyrim_current_user')) || null;
let membersList = JSON.parse(localStorage.getItem('skyrim_members')) || [];
let activityLogs = JSON.parse(localStorage.getItem('skyrim_activity_logs')) || [];

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

// --- INITIALISATION & GESTION RETOUR DISCORD ---
document.addEventListener('DOMContentLoaded', () => {
    renderActivityLog();
    renderMembers();

    // 1. Vérification si un utilisateur est déjà connecté en mémoire
    if (currentUser) {
        updateUserUI();
    }

    // 2. Détection du retour de Discord (?code=...)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        // Nettoie l'URL pour retirer le ?code=...
        window.history.replaceState({}, document.title, window.location.pathname);

        // Si l'utilisateur n'est pas encore inscrit RP, on lui ouvre le formulaire d'inscription
        if (!currentUser) {
            const regModal = document.getElementById('registration-modal');
            if (regModal) regModal.classList.remove('hidden');
        }
    }
});

// --- FORMULAIRE D'INSCRIPTION RP ---
document.getElementById('registration-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const rpName = document.getElementById('rp-name').value.trim();
    const rpJob = document.getElementById('rp-job').value;

    if (!rpName) return;

    // Création du profil utilisateur
    currentUser = {
        rpName: rpName,
        job: rpJob,
        joinedAt: new Date().toLocaleDateString('fr-FR')
    };

    // Sauvegarde locale de l'utilisateur connecté
    localStorage.setItem('skyrim_current_user', JSON.stringify(currentUser));

    // Ajout à la liste des membres
    membersList.push(currentUser);
    localStorage.setItem('skyrim_members', JSON.stringify(membersList));

    // Fermeture de la modal
    document.getElementById('registration-modal')?.classList.add('hidden');

    // Mise à jour de l'affichage
    updateUserUI();
    renderMembers();

    // Journal d'activité
    logActivity("Inscription", `${rpName} a rejoint le clan en tant que ${rpJob}.`);

    // Envoi des données vers Google Sheets
    syncWithGoogleSheets({
        action: "register_member",
        rpName: rpName,
        job: rpJob,
        date: currentUser.joinedAt
    });
});

// --- MISE À JOUR DE L'INTERFACE UTILISATEUR ---
function updateUserUI() {
    if (!currentUser) return;

    const loginBtn = document.getElementById('discord-login-btn');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');

    if (loginBtn) loginBtn.classList.add('hidden');
    if (userProfile) userProfile.classList.remove('hidden');
    if (userName) userName.textContent = `${currentUser.rpName} (${currentUser.job})`;
}

// --- AFFICHAGE DU REGISTRE DES MEMBRES ---
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

// --- MODAL LÉGALE ---
document.getElementById('open-legal-btn')?.addEventListener('click', () => {
    document.getElementById('legal-modal')?.classList.remove('hidden');
});

document.getElementById('close-legal-btn')?.addEventListener('click', () => {
    document.getElementById('legal-modal')?.classList.add('hidden');
});

// --- SYNCHRONISATION GOOGLE SHEETS ---
async function syncWithGoogleSheets(data) {
    if (!GOOGLE_SHEET_URL) return;
    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (err) {
        console.error("Erreur de synchronisation Google Sheets :", err);
    }
}

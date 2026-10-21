// URL WebApp Google Sheets
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzHmNh6wEEMGNfylskirp6jstABo2fzeGqkHLx7bTFpdUhE4ulD7Vzp-Xpnkss4nVKl/exec";

let currentUser = JSON.parse(localStorage.getItem('skyrim_current_user')) || null;
let activityLogs = JSON.parse(localStorage.getItem('skyrim_activity_logs')) || [];

// --- NAVIGATION ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// --- CONNEXION DISCORD OAUTH2 ---
const DISCORD_OAUTH_URL = "https://discord.com/oauth2/authorize?client_id=1562350704058961990&response_type=code&redirect_uri=https%3A%2F%2Fpsychotiiks.github.io%2FClan-Roche-Lame%2F&scope=identify";

document.getElementById('discord-login-btn')?.addEventListener('click', () => {
    if (DISCORD_OAUTH_URL.includes("METTRE_VOTRE_LIEN")) {
        alert("Veuillez configurer le lien OAuth2 Discord dans app.js !");
        return;
    }
    // Redirige l'utilisateur vers la page de connexion Discord
    window.location.href = DISCORD_OAUTH_URL;
});

// --- GESTION DU CHARGEMENT DE LA PAGE ET DU RETOUR DISCORD ---
document.addEventListener('DOMContentLoaded', () => {
    renderActivityLog();

    // Vérifie si l'URL contient un code de retour Discord (?code=...)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        // Nettoie l'URL pour enlever le ?code=...
        window.history.replaceState({}, document.title, window.location.pathname);

        console.log("Code d'autorisation Discord reçu :", code);

        // Simulation d'un utilisateur connecté
        currentUser = {
            rpName: "Artisan du Clan",
            discordTag: "Utilisateur Discord"
        };

        // Sauvegarde de la connexion
        localStorage.setItem('skyrim_current_user', JSON.stringify(currentUser));
    }

    // Met à jour l'interface si un utilisateur est connecté
    updateUserUI();
});

// Fonction pour mettre à jour l'interface utilisateur connectée
function updateUserUI() {
    if (currentUser) {
        const loginBtn = document.getElementById('discord-login-btn');
        const userProfile = document.getElementById('user-profile');
        const userName = document.getElementById('user-name');

        if (loginBtn) loginBtn.classList.add('hidden');
        if (userProfile) userProfile.classList.remove('hidden');
        if (userName) userName.textContent = currentUser.rpName;
    }
}

// --- JOURNAL DE BORD ---
function logActivity(category, actionText) {
    const author = currentUser ? `${currentUser.rpName}` : "Anonyme";
    const dateStr = new Date().toLocaleDateString('fr-FR') + " " + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    activityLogs.unshift({ date: dateStr, author: author, category: category, action: actionText });
    if (activityLogs.length > 100) activityLogs.pop();
    localStorage.setItem('skyrim_activity_logs', JSON.stringify(activityLogs));
    renderActivityLog();
}

function renderActivityLog() {
    const tbody = document.getElementById('activity-log-body');
    if (!tbody) return;
    tbody.innerHTML = activityLogs.length === 0 ? `<tr><td colspan="4" style="text-align:center;">Aucune activité enregistrée.</td></tr>` : '';
    activityLogs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${log.date}</td><td>${log.author}</td><td>${log.category}</td><td>${log.action}</td>`;
        tbody.appendChild(tr);
    });
}

// --- MODAL LÉGALE ---
document.getElementById('open-legal-btn')?.addEventListener('click', () => document.getElementById('legal-modal').classList.remove('hidden'));
document.getElementById('close-legal-btn')?.addEventListener('click', () => document.getElementById('legal-modal').classList.add('hidden'));

// --- SYNCHRONISATION GOOGLE SHEETS ---
async function syncWithGoogleSheets(data) {
    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("TA_LINK")) return;
    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (err) {
        console.error("Erreur de synchronisation Google Sheets:", err);
    }
}

// URL WebApp Google Sheets
const GOOGLE_SHEET_URL = "TA_LINK_GOOGLE_SHEET_WEBAPP_ICI";
let currentUser = null;
let activityLogs = JSON.parse(localStorage.getItem('skyrim_activity_logs')) || [];

// Navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// --- CONNEXION DISCORD OAUTH2 ---
const DISCORD_OAUTH_URL = "METTRE_VOTRE_LIEN_OAUTH2_DISCORD_ICI";

document.getElementById('discord-login-btn')?.addEventListener('click', () => {
    if (DISCORD_OAUTH_URL.includes("METTRE_VOTRE_LIEN")) {
        alert("Veuillez configurer le lien OAuth2 Discord dans app.js !");
        return;
    }
    // Redirige l'utilisateur vers la page de connexion Discord
    window.location.href = DISCORD_OAUTH_URL;
});

// Journal de bord
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

// Modal Légale
document.getElementById('open-legal-btn')?.addEventListener('click', () => document.getElementById('legal-modal').classList.remove('hidden'));
document.getElementById('close-legal-btn')?.addEventListener('click', () => document.getElementById('legal-modal').classList.add('hidden'));

// Synchronisation Google Sheets
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

document.addEventListener('DOMContentLoaded', () => {
    renderActivityLog();
});

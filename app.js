// --- URL WEBAPP GOOGLE SHEETS ---
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzQL2GOmpEekI00G0q13gqW8Je9-TwT-az1ACOD6q-r4aClwuIigtIezPqQGRPHjuP3/exec";

let currentUser = JSON.parse(localStorage.getItem('skyrim_current_user')) || null;
let membersList = [];
let activityLogs = [];
let gemsStock = [];
let recipesList = [];

// --- NAVIGATION PAR ONGLETS ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = document.getElementById('tab-' + btn.dataset.tab);
        if (targetTab) targetTab.classList.add('active');
    });
});

// --- CONNEXION DISCORD OAUTH2 ---
const DISCORD_OAUTH_URL = "https://discord.com/oauth2/authorize?client_id=1562350704058961990&response_type=code&redirect_uri=https%3A%2F%2Fpsychotiiks.github.io%2FClan-Roche-Lame%2F&scope=identify";

document.getElementById('discord-login-btn')?.addEventListener('click', () => {
    window.location.href = DISCORD_OAUTH_URL;
});

// --- INITIALISATION & CHARGEMENT DEPUIS GOOGLE SHEETS ---
document.addEventListener('DOMContentLoaded', async () => {
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

    // Chargement global depuis la base de données Google Sheets
    await loadDataFromGoogleSheets();
});

async function loadDataFromGoogleSheets() {
    if (!GOOGLE_SHEET_URL) return;
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const data = await response.json();

        membersList = data.members || [];
        gemsStock = data.gems || [];
        recipesList = data.recipes || [];
        activityLogs = data.logs || [];

        renderMembers();
        renderGemsStock();
        renderRecipes();
        renderActivityLog();
    } catch (err) {
        console.error("Erreur de chargement des données Google Sheets :", err);
    }
}

// --- FORMULAIRE D'INSCRIPTION RP ---
document.getElementById('registration-form')?.addEventListener('submit', async (e) => {
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
    document.getElementById('registration-modal')?.classList.add('hidden');

    updateUserUI();

    await syncWithGoogleSheets({
        action: "register_member",
        rpName: rpName,
        job: rpJob,
        date: currentUser.joinedAt,
        author: rpName,
        category: "Inscription",
        actionText: rpName + " a rejoint le clan en tant que " + rpJob + "."
    });

    await loadDataFromGoogleSheets();
});

// --- MISE À JOUR DE L'INTERFACE UTILISATEUR & DES RÔLES ---
function updateUserUI() {
    if (!currentUser) return;

    const loginBtn = document.getElementById('discord-login-btn');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');

    if (loginBtn) loginBtn.classList.add('hidden');
    if (userProfile) userProfile.classList.remove('hidden');
    if (userName) userName.textContent = currentUser.rpName + " (" + currentUser.job + ")";

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
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucun membre inscrit.</td></tr>';
        return;
    }

    let rows = membersList.map(m => {
        return '<tr>' +
            '<td><strong>' + (m.rpName || '-') + '</strong></td>' +
            '<td><span class="role-badge">' + (m.job || '-') + '</span></td>' +
            '<td>' + (m.joinedAt || '-') + '</td>' +
        '</tr>';
    }).join('');

    tbody.innerHTML = '<thead><tr><th>Nom RP</th><th>Rôle / Métier</th><th>Date d\'inscription</th></tr></thead><tbody>' + rows + '</tbody>';
}

// --- JOURNAL DE BORD ---
function renderActivityLog() {
    const tbody = document.getElementById('activity-log-body');
    if (!tbody) return;

    if (activityLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aucune activité enregistrée.</td></tr>';
        return;
    }

    tbody.innerHTML = activityLogs.map(log => {
        return '<tr>' +
            '<td>' + (log.date || '-') + '</td>' +
            '<td><strong>' + (log.author || 'Anonyme') + '</strong></td>' +
            '<td><span class="role-badge">' + (log.category || 'Général') + '</span></td>' +
            '<td>' + (log.action || '-') + '</td>' +
        '</tr>';
    }).join('');
}

// --- STOCK DE GEMMES (ENCHANTEMENT) ---
function renderGemsStock() {
    const tbody = document.getElementById('gems-unified-body');
    if (!tbody) return;

    if (gemsStock.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucune gemme dans le stock.</td></tr>';
        return;
    }

    tbody.innerHTML = gemsStock.map(g => {
        const badgeColor = g.state === 'Pleine' ? '#ffd700' : '#8c8275';
        return '<tr>' +
            '<td><strong>' + g.name + '</strong></td>' +
            '<td><span class="role-badge" style="color: ' + badgeColor + ';">' + g.state + '</span></td>' +
            '<td>Quantité : <strong>' + g.qty + '</strong></td>' +
        '</tr>';
    }).join('');
}

document.getElementById('add-gem-btn')?.addEventListener('click', () => {
    document.getElementById('gem-modal')?.classList.remove('hidden');
});

document.getElementById('gem-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('gem-name')?.value;
    const state = document.getElementById('gem-state')?.value;
    const qty = parseInt(document.getElementById('gem-qty')?.value) || 1;

    if (!name || !state) return;

    document.getElementById('gem-modal')?.classList.add('hidden');
    document.getElementById('gem-form')?.reset();

    await syncWithGoogleSheets({
        action: "add_gem",
        name: name,
        state: state,
        qty: qty,
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: "Enchantement",
        actionText: "Ajout de gemme : " + qty + "x " + name + " (" + state + ")"
    });

    await loadDataFromGoogleSheets();
});

// --- RECETTES D'ENCHANTEMENT ---
function renderRecipes() {
    const tbody = document.getElementById('recipes-table-body');
    if (!tbody) return;

    if (recipesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Aucune recette personnalisée.</td></tr>';
        return;
    }

    tbody.innerHTML = recipesList.map(r => 
        '<tr><td><strong>' + r.name + '</strong></td><td>' + r.ingredients + '</td></tr>'
    ).join('');
}

document.getElementById('add-recipe-btn')?.addEventListener('click', () => document.getElementById('recipe-modal')?.classList.remove('hidden'));
document.getElementById('recipe-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('recipe-name').value;
    const ingredients = document.getElementById('recipe-ingredients').value;

    document.getElementById('recipe-modal')?.classList.add('hidden');
    document.getElementById('recipe-form').reset();

    await syncWithGoogleSheets({
        action: "add_recipe",
        category: "Enchantement",
        name: name,
        ingredients: ingredients,
        author: currentUser ? currentUser.rpName : "Anonyme",
        actionText: "Nouvelle recette d'enchantement : \"" + name + "\""
    });

    await loadDataFromGoogleSheets();
});

// --- FERMETURE DES MODALES ---
document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetModalId = btn.getAttribute('data-target');
        if (targetModalId) {
            document.getElementById(targetModalId)?.classList.add('hidden');
        }
    });
});

// --- ENVOI DES DONNÉES À GOOGLE SHEETS ---
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

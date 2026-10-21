// --- URL WEBAPP GOOGLE SHEETS ---
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzHmNh6wEEMGNfylskirp6jstABo2fzeGqkHLx7bTFpdUhE4ulD7Vzp-Xpnkss4nVKl/exec";

let currentUser = JSON.parse(localStorage.getItem('skyrim_current_user')) || null;
let membersList = [];
let activityLogs = [];
let gemsStock = [];
let recipesList = [];
let ingredientsStock = [];
let forgeStock = [];
let clothStock = [];

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

// --- DÉCONNEXION ---
document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('skyrim_current_user');
    currentUser = null;
    window.location.reload();
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
        ingredientsStock = data.ingredients || [];
        forgeStock = data.forge || [];
        clothStock = data.cloth || [];

        renderMembers();
        renderGemsStock();
        renderRecipes();
        renderGenericStock('ingredients-table-body', ingredientsStock, 'alchimiste', 'Ingredients');
        renderGenericStock('forge-materials-body', forgeStock, 'forgeron', 'Forge');
        renderGenericStock('cloth-stock-body', clothStock, 'couturier', 'Couture');
        renderActivityLog();
    } catch (err) {
        console.error("Erreur de chargement Google Sheets :", err);
    }
}

// --- INSCRIPTION ---
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

function renderMembers() {
    const tbody = document.getElementById('members-list');
    if (!tbody) return;
    if (membersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucun membre inscrit.</td></tr>';
        return;
    }
    tbody.innerHTML = '<thead><tr><th>Nom RP</th><th>Rôle / Métier</th><th>Date d\'inscription</th></tr></thead><tbody>' +
        membersList.map(m => '<tr><td><strong>' + (m.rpName || '-') + '</strong></td><td><span class="role-badge">' + (m.job || '-') + '</span></td><td>' + (m.joinedAt || '-') + '</td></tr>').join('') +
        '</tbody>';
}

function renderActivityLog() {
    const tbody = document.getElementById('activity-log-body');
    if (!tbody) return;
    if (activityLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aucune activité.</td></tr>';
        return;
    }
    tbody.innerHTML = activityLogs.map(log => 
        '<tr><td>' + (log.date || '-') + '</td><td><strong>' + (log.author || 'Anonyme') + '</strong></td><td><span class="role-badge">' + (log.category || 'Général') + '</span></td><td>' + (log.action || '-') + '</td></tr>'
    ).join('');
}

// --- GEMMES (ENCHANTEMENT) ---
function renderGemsStock() {
    const tbody = document.getElementById('gems-unified-body');
    if (!tbody) return;

    if (gemsStock.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aucune gemme en stock.</td></tr>';
        return;
    }

    tbody.innerHTML = gemsStock.map((g, i) => {
        const badgeColor = g.state === 'Pleine' ? '#ffd700' : '#8c8275';
        const isAllowed = currentUser && currentUser.job === 'enchanteur';
        const actionBtn = isAllowed 
            ? `<button class="skyrim-btn-small remove-gem-btn" data-index="${i}" style="background:#8b0000; color:#fff; border-color:#ff4500;">➖ Retirer 1</button>` 
            : '-';

        return '<tr>' +
            '<td><strong>' + g.name + '</strong></td>' +
            '<td><span class="role-badge" style="color: ' + badgeColor + ';">' + g.state + '</span></td>' +
            '<td>Quantité : <strong>' + g.qty + '</strong></td>' +
            '<td>' + actionBtn + '</td>' +
        '</tr>';
    }).join('');

    document.querySelectorAll('.remove-gem-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const item = gemsStock[e.target.dataset.index];
            if (!item) return;
            await syncWithGoogleSheets({
                action: "remove_gem",
                name: item.name,
                state: item.state,
                qty: 1,
                author: currentUser ? currentUser.rpName : "Anonyme",
                category: "Enchantement",
                actionText: "Retrait de gemmes : 1x " + item.name + " (" + item.state + ")"
            });
            await loadDataFromGoogleSheets();
        });
    });
}

document.getElementById('add-gem-btn')?.addEventListener('click', () => document.getElementById('gem-modal')?.classList.remove('hidden'));
document.getElementById('gem-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('gem-name')?.value;
    const state = document.getElementById('gem-state')?.value;
    const qty = parseInt(document.getElementById('gem-qty')?.value) || 1;

    document.getElementById('gem-modal')?.classList.add('hidden');
    document.getElementById('gem-form')?.reset();

    await syncWithGoogleSheets({
        action: "add_gem",
        name: name,
        state: state,
        qty: qty,
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: "Enchantement",
        actionText: "Ajout de gemmes : " + qty + "x " + name + " (" + state + ")"
    });

    await loadDataFromGoogleSheets();
});

// --- RENDER UNIVERSEL DES STOCKS (ALCHIMIE / FORGE / COUTURE) ---
function renderGenericStock(elementId, list, requiredRole, categoryName) {
    const tbody = document.getElementById(elementId);
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Stock vide.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map((item, i) => {
        const isAllowed = currentUser && currentUser.job === requiredRole;
        const actionBtn = isAllowed 
            ? `<button class="skyrim-btn-small remove-item-btn" data-sheet="${categoryName}" data-index="${i}" style="background:#8b0000; color:#fff; border-color:#ff4500;">➖ Retirer 1</button>` 
            : '-';

        return '<tr>' +
            '<td><strong>' + item.name + '</strong></td>' +
            '<td>Quantité : <strong>' + item.qty + '</strong></td>' +
            '<td>' + actionBtn + '</td>' +
        '</tr>';
    }).join('');

    tbody.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = e.target.dataset.index;
            const sheetName = e.target.dataset.sheet;
            const item = list[index];
            if (!item) return;

            await syncWithGoogleSheets({
                action: "remove_item",
                sheetName: sheetName,
                name: item.name,
                qty: 1,
                author: currentUser ? currentUser.rpName : "Anonyme",
                category: categoryName,
                actionText: "Consommation/Retrait : 1x " + item.name
            });

            await loadDataFromGoogleSheets();
        });
    });
}

function renderRecipes() {
    const tbody = document.getElementById('recipes-table-body');
    if (!tbody) return;
    if (recipesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Aucune recette.</td></tr>';
        return;
    }
    tbody.innerHTML = recipesList.map(r => '<tr><td><strong>' + r.name + '</strong></td><td>' + r.ingredients + '</td></tr>').join('');
}

document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetModalId = btn.getAttribute('data-target');
        if (targetModalId) document.getElementById(targetModalId)?.classList.add('hidden');
    });
});

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

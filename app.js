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
        const targetTab = document.getElementById('tab-' + btn.dataset.tab);
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

    logActivity("Inscription", rpName + " a rejoint le clan en tant que " + rpJob + ".");

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
    if (userName) userName.textContent = currentUser.rpName + " (" + currentUser.job + ")";

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
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucun membre inscrit pour le moment.</td></tr>';
        return;
    }

    let rows = membersList.map(m => {
        return '<tr>' +
            '<td><strong>' + m.rpName + '</strong></td>' +
            '<td><span class="role-badge">' + m.job + '</span></td>' +
            '<td>' + (m.joinedAt || '-') + '</td>' +
        '</tr>';
    }).join('');

    tbody.innerHTML = '<thead><tr><th>Nom RP</th><th>Rôle / Métier</th><th>Date d\'inscription</th></tr></thead><tbody>' + rows + '</tbody>';
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
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aucune activité enregistrée.</td></tr>';
        return;
    }

    tbody.innerHTML = activityLogs.map(log => {
        return '<tr>' +
            '<td>' + log.date + '</td>' +
            '<td><strong>' + log.author + '</strong></td>' +
            '<td><span class="role-badge">' + log.category + '</span></td>' +
            '<td>' + log.action + '</td>' +
        '</tr>';
    }).join('');
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
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucune gemme enregistrée dans le stock.</td></tr>';
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

document.getElementById('gem-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('gem-name')?.value;
    const state = document.getElementById('gem-state')?.value;
    const qty = parseInt(document.getElementById('gem-qty')?.value) || 1;

    if (!name || !state) return;

    const existing = gemsStock.find(g => g.name === name && g.state === state);
    if (existing) {
        existing.qty += qty;
    } else {
        gemsStock.push({ name: name, state: state, qty: qty });
    }

    localStorage.setItem('skyrim_gems_stock', JSON.stringify(gemsStock));
    renderGemsStock();

    logActivity("Enchantement", "Ajout de gemmes : " + qty + "x " + name + " (" + state + ").");
    document.getElementById('gem-modal')?.classList.add('hidden');
    document.getElementById('gem-form')?.reset();
});

// --- VENTES ET RECETTES ENCHANTEMENT ---
document.getElementById('open-sale-modal-btn')?.addEventListener('click', () => document.getElementById('sale-modal')?.classList.remove('hidden'));
document.getElementById('sale-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = document.getElementById('sale-item').value;
    const amount = parseInt(document.getElementById('sale-amount').value) || 0;

    const goldElem = document.getElementById('total-enchantement-gold');
    if (goldElem) {
        goldElem.textContent = (parseInt(goldElem.textContent) || 0) + amount;
    }

    logActivity("Vente", "Vente de \"" + item + "\" pour " + amount + " Septims.");
    document.getElementById('sale-modal')?.classList.add('hidden');
    document.getElementById('sale-form').reset();
});

document.getElementById('add-recipe-btn')?.addEventListener('click', () => document.getElementById('recipe-modal')?.classList.remove('hidden'));
document.getElementById('recipe-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('recipe-name').value;
    const ingredients = document.getElementById('recipe-ingredients').value;

    const tbody = document.getElementById('recipes-table-body');
    if (tbody) {
        tbody.innerHTML += '<tr><td><strong>' + name + '</strong></td><td>' + ingredients + '</td></tr>';
    }

    logActivity("Recette", "Nouvelle recette d'enchantement : \"" + name + "\".");
    document.getElementById('recipe-modal')?.classList.add('hidden');
    document.getElementById('recipe-form').reset();
});

// --- ALCHIMIE ---
document.getElementById('add-ingredient-btn')?.addEventListener('click', () => document.getElementById('ingredient-modal')?.classList.remove('hidden'));
document.getElementById('ingredient-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('ing-name').value;
    const qty = document.getElementById('ing-qty').value;
    const tbody = document.getElementById('ingredients-table-body');
    if (tbody) {
        tbody.innerHTML += '<tr><td><strong>' + name + '</strong></td><td>Quantité : ' + qty + '</td></tr>';
    }
    logActivity("Alchimie", "Ajout d'ingrédient : " + name + " (x" + qty + ")");
    document.getElementById('ingredient-modal')?.classList.add('hidden');
    document.getElementById('ingredient-form').reset();
});

document.getElementById('add-potion-recipe-btn')?.addEventListener('click', () => document.getElementById('potion-modal')?.classList.remove('hidden'));
document.getElementById('potion-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('pot-name').value;
    const desc = document.getElementById('pot-desc').value;
    const tbody = document.getElementById('potion-recipes-table-body');
    if (tbody) {
        tbody.innerHTML += '<tr><td><strong>' + name + '</strong></td><td>' + desc + '</td></tr>';
    }
    logActivity("Alchimie", "Nouvelle potion : " + name);
    document.getElementById('potion-modal')?.classList.add('hidden');
    document.getElementById('potion-form').reset();
});

// --- FORGE ---
document.getElementById('add-forge-mat-btn')?.addEventListener('click', () => document.getElementById('forge-mat-modal')?.classList.remove('hidden'));
document.getElementById('forge-mat-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('fmat-name').value;
    const qty = document.getElementById('fmat-qty').value;
    const tbody = document.getElementById('forge-materials-body');
    if (tbody) {
        tbody.innerHTML += '<tr><td><strong>' + name + '</strong></td><td>Quantité : ' + qty + '</td></tr>';
    }
    logActivity("Forge", "Ajout matériau : " + name + " (x" + qty + ")");
    document.getElementById('forge-mat-modal')?.classList.add('hidden');
    document.getElementById('forge-mat-form').reset();
});

document.getElementById('add-forge-plan-btn')?.addEventListener('click', () => document.getElementById('forge-plan-modal')?.classList.remove('hidden'));
document.getElementById('forge-plan-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('fplan-name').value;
    const req = document.getElementById('fplan-req').value;
    const tbody = document.getElementById('forge-plans-body');
    if (tbody) {
        tbody.innerHTML += '<tr><td><strong>' + name + '</strong></td><td>' + req + '</td></tr>';
    }
    logActivity("Forge", "Nouveau plan de forge : " + name);
    document.getElementById('forge-plan-modal')?.classList.add('hidden');
    document.getElementById('forge-plan-form').reset();
});

// --- COUTURIER ---
document.getElementById('add-cloth-btn')?.addEventListener('click', () => document.getElementById('cloth-modal')?.classList.remove('hidden'));
document.getElementById('cloth-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cloth-name').value;
    const qty = document.getElementById('cloth-qty').value;
    const tbody = document.getElementById('cloth-stock-body');
    if (tbody) {
        tbody.innerHTML += '<tr><td><strong>' + name + '</strong></td><td>Quantité : ' + qty + '</td></tr>';
    }
    logActivity("Couture", "Ajout tissu : " + name + " (x" + qty + ")");
    document.getElementById('cloth-modal')?.classList.add('hidden');
    document.getElementById('cloth-form').reset();
});

document.getElementById('add-pattern-btn')?.addEventListener('click', () => document.getElementById('pattern-modal')?.classList.remove('hidden'));
document.getElementById('pattern-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('pat-name').value;
    const req = document.getElementById('pat-req').value;
    const tbody = document.getElementById('tailor-patterns-body');
    if (tbody) {
        tbody.innerHTML += '<tr><td><strong>' + name + '</strong></td><td>' + req + '</td></tr>';
    }
    logActivity("Couture", "Nouveau patron : " + name);
    document.getElementById('pattern-modal')?.classList.add('hidden');
    document.getElementById('pattern-form').reset();
});

// --- MODAL LÉGALE ---
document.getElementById('open-legal-btn')?.addEventListener('click', () => document.getElementById('legal-modal')?.classList.remove('hidden'));
document.getElementById('close-legal-btn')?.addEventListener('click', () => document.getElementById('legal-modal')?.classList.add('hidden'));

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

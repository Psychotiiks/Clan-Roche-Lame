// --- URL WEBAPP GOOGLE SHEETS ---
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyOt9la5R2nxJLQ55d1-sgRU8sqcghclJsXGFz5m8gAXasV4SXtyBsa3gtfZVZlewND/exec";

let currentUser = JSON.parse(localStorage.getItem('skyrim_current_user')) || null;
let membersList = [];
let activityLogs = [];
let gemsStock = [];
let recipesList = [];
let ingredientsStock = [];
let forgeStock = [];
let clothStock = [];
let coffreStock = [];
let currentCoffreFilter = "Toutes";

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

// --- INITIALISATION DE LA PAGE ---
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

function appendLocalLog(category, actionText) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR') + " " + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    activityLogs.unshift({
        date: dateStr,
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: category || "Général",
        action: actionText
    });
    renderActivityLog();
}

async function loadDataFromGoogleSheets() {
    if (!GOOGLE_SHEET_URL) return;
    try {
        const response = await fetch(GOOGLE_SHEET_URL + "?t=" + Date.now());
        const data = await response.json();

        membersList = data.members || [];
        gemsStock = data.gems || [];
        recipesList = data.recipes || [];
        activityLogs = data.logs || [];
        ingredientsStock = data.ingredients || [];
        forgeStock = data.forge || [];
        clothStock = data.cloth || [];
        coffreStock = (data.coffre || []).map(item => ({
            name: String(item.name || '').trim(),
            category: String(item.category || 'Divers').trim(),
            qty: parseInt(item.qty) || 0
        }));

        renderMembers();
        renderGenericStock('gems-unified-body', gemsStock, 'enchanteur', 'Gems');
        renderGenericStock('ingredients-table-body', ingredientsStock, 'alchimiste', 'Ingredients');
        renderGenericStock('forge-materials-body', forgeStock, 'forgeron', 'Forge');
        renderGenericStock('cloth-stock-body', clothStock, 'couturier', 'Couture');
        renderCoffreStock();
        renderRecipes();
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

    membersList.push({ rpName: rpName, job: rpJob, joinedAt: currentUser.joinedAt });
    renderMembers();
    updateUserUI();

    const msg = rpName + " a rejoint le clan en tant que " + rpJob + ".";
    appendLocalLog("Inscription", msg);

    syncWithGoogleSheets({
        action: "register_member",
        rpName: rpName,
        job: rpJob,
        date: currentUser.joinedAt,
        author: rpName,
        category: "Inscription",
        actionText: msg
    });
});

function updateUserUI() {
    if (!currentUser) return;

    const loginBtn = document.getElementById('discord-login-btn');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');
    const addCoffreBtn = document.getElementById('add-coffre-btn');

    if (loginBtn) loginBtn.classList.add('hidden');
    if (userProfile) userProfile.classList.remove('hidden');
    if (userName) userName.textContent = currentUser.rpName + " (" + currentUser.job + ")";
    if (addCoffreBtn) addCoffreBtn.classList.remove('hidden');

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

// --- RENDU DES STOCKS MÉTIERS ---
function renderGenericStock(elementId, list, requiredRole, categoryName) {
    const tbody = document.getElementById(elementId);
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Stock vide.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map((item, i) => {
        const isAllowed = currentUser && (currentUser.job === requiredRole);

        let stockDisplay = '<strong style="font-size: 1.1em; color: #ffd700;">' + item.qty + '</strong>';

        let actionControls = '<span style="color: #8c8275; font-style: italic;">Lecture seule</span>';
        if (isAllowed) {
            actionControls =
                '<div style="display: flex; align-items: center; gap: 6px;">' +
                    '<button type="button" class="skyrim-btn-small qty-action-btn" data-action="minus" data-sheet="' + categoryName + '" data-index="' + i + '" style="background:#8b0000; color:#fff; padding:4px 10px;" title="Retirer cette quantité">-</button>' +
                    '<input type="number" class="table-input qty-delta-input" data-sheet="' + categoryName + '" data-index="' + i + '" value="1" min="1" style="width: 60px; text-align: center;" title="Quantité à ajouter/retirer">' +
                    '<button type="button" class="skyrim-btn-small qty-action-btn" data-action="plus" data-sheet="' + categoryName + '" data-index="' + i + '" style="background:#006400; color:#fff; padding:4px 10px;" title="Ajouter cette quantité">+</button>' +
                    '<button type="button" class="skyrim-btn-small delete-item-btn" data-sheet="' + categoryName + '" data-index="' + i + '" title="Supprimer l\'élément" style="background:#333; color:#ff4500; border-color:#ff4500; margin-left: 10px;">🗑️</button>' +
                '</div>';
        }

        return '<tr>' +
            '<td><strong>' + item.name + '</strong></td>' +
            '<td>' + (item.state ? '<span class="role-badge" style="color:' + (item.state === 'Pleine' ? '#ffd700' : '#8c8275') + ';">' + item.state + '</span>' : categoryName) + '</td>' +
            '<td style="text-align: center;">' + stockDisplay + '</td>' +
            '<td>' + actionControls + '</td>' +
        '</tr>';
    }).join('');

    tbody.querySelectorAll('.qty-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.index;
            const sheetName = e.currentTarget.dataset.sheet;
            const action = e.currentTarget.dataset.action;

            const listRef = getStockListByName(sheetName);
            const item = listRef[index];
            if (!item) return;

            const row = e.currentTarget.closest('tr');
            const deltaInput = row.querySelector('.qty-delta-input');
            const delta = Math.max(1, parseInt(deltaInput.value) || 1);

            const currentQty = parseInt(item.qty) || 0;
            const newQty = action === 'plus' ? (currentQty + delta) : Math.max(0, currentQty - delta);

            item.qty = newQty;
            renderGenericStock(elementId, listRef, requiredRole, categoryName);

            const msg = "Quantité de " + item.name + " modifiée à " + newQty;
            appendLocalLog(categoryName, msg);

            syncWithGoogleSheets({
                action: "update_qty",
                sheetName: sheetName,
                name: item.name,
                state: item.state || "",
                qty: newQty,
                author: currentUser ? currentUser.rpName : "Anonyme",
                category: sheetName,
                actionText: msg
            });
        });
    });

    tbody.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.index;
            const sheetName = e.currentTarget.dataset.sheet;
            const listRef = getStockListByName(sheetName);
            const item = listRef[index];
            if (!item) return;

            if (confirm('Voulez-vous supprimer "' + item.name + '" du stock ?')) {
                listRef.splice(index, 1);
                renderGenericStock(elementId, listRef, requiredRole, categoryName);

                const msg = "Suppression de " + item.name + " du stock.";
                appendLocalLog(categoryName, msg);

                syncWithGoogleSheets({
                    action: "delete_item",
                    sheetName: sheetName,
                    name: item.name,
                    author: currentUser ? currentUser.rpName : "Anonyme",
                    category: sheetName,
                    actionText: msg
                });
            }
        });
    });
}

function getStockListByName(sheetName) {
    if (sheetName === 'Gems') return gemsStock;
    if (sheetName === 'Ingredients') return ingredientsStock;
    if (sheetName === 'Forge') return forgeStock;
    if (sheetName === 'Couture') return clothStock;
    return [];
}

// --- GESTION DU COFFRE COMMUN ---
document.querySelectorAll('.coffre-cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.coffre-cat-btn').forEach(b => {
            b.classList.remove('active');
            b.style.borderColor = '#5a4a32';
            b.style.color = '#d4af37';
        });
        e.currentTarget.classList.add('active');
        e.currentTarget.style.borderColor = '#ffd700';
        e.currentTarget.style.color = '#ffd700';

        currentCoffreFilter = e.currentTarget.dataset.cat;
        const titleEl = document.getElementById('coffre-current-title');
        if (titleEl) {
            titleEl.textContent = currentCoffreFilter === "Toutes"
                ? "📦 Contenu du Coffre Commun (Toutes catégories)"
                : "📦 Coffre Commun — Catégorie : " + currentCoffreFilter;
        }
        renderCoffreStock();
    });
});

function renderCoffreStock() {
    const tbody = document.getElementById('coffre-table-body');
    if (!tbody) return;

    const filteredList = currentCoffreFilter === "Toutes"
        ? coffreStock
        : coffreStock.filter(item => (item.category || 'Divers').toLowerCase() === currentCoffreFilter.toLowerCase());

    if (!filteredList || filteredList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aucun objet dans cette catégorie.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredList.map((item) => {
        const isConnected = !!currentUser;
        const safeName = encodeURIComponent(item.name);
        const safeCat = encodeURIComponent(item.category || 'Divers');

        let stockDisplay = '<strong style="font-size: 1.1em; color: #ffd700;">' + (parseInt(item.qty) || 0) + '</strong>';
        let actionControls = '<span style="color: #8c8275; font-style: italic;">Connectez-vous pour interagir</span>';

        if (isConnected) {
            actionControls =
                '<div style="display: flex; align-items: center; gap: 6px;">' +
                    '<button type="button" class="skyrim-btn-small coffre-qty-btn" data-action="minus" data-name="' + safeName + '" data-cat="' + safeCat + '" style="background:#8b0000; color:#fff; padding:4px 10px;" title="Retirer cette quantité">-</button>' +
                    '<input type="number" class="table-input coffre-delta-input" value="1" min="1" style="width: 75px; text-align: center;" title="Quantité à ajouter/retirer">' +
                    '<button type="button" class="skyrim-btn-small coffre-qty-btn" data-action="plus" data-name="' + safeName + '" data-cat="' + safeCat + '" style="background:#006400; color:#fff; padding:4px 10px;" title="Ajouter cette quantité">+</button>' +
                    '<button type="button" class="skyrim-btn-small delete-coffre-btn" data-name="' + safeName + '" data-cat="' + safeCat + '" title="Supprimer l\'objet" style="background:#333; color:#ff4500; border-color:#ff4500; margin-left: 10px;">🗑️</button>' +
                '</div>';
        }

        return '<tr>' +
            '<td><strong>' + item.name + '</strong></td>' +
            '<td><span class="role-badge">' + (item.category || 'Divers') + '</span></td>' +
            '<td style="text-align: center;">' + stockDisplay + '</td>' +
            '<td>' + actionControls + '</td>' +
        '</tr>';
    }).join('');

    tbody.querySelectorAll('.coffre-qty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetName = decodeURIComponent(e.currentTarget.dataset.name);
            const targetCat = decodeURIComponent(e.currentTarget.dataset.cat);
            const action = e.currentTarget.dataset.action;

            const item = coffreStock.find(
                i => String(i.name).trim().toLowerCase() === targetName.trim().toLowerCase() &&
                     String(i.category || 'Divers').trim().toLowerCase() === targetCat.trim().toLowerCase()
            );
            if (!item) return;

            const row = e.currentTarget.closest('tr');
            const deltaInput = row.querySelector('.coffre-delta-input');
            const delta = Math.max(1, parseInt(deltaInput.value) || 1);

            const currentQty = parseInt(item.qty) || 0;
            const newQty = action === 'plus' ? (currentQty + delta) : Math.max(0, currentQty - delta);

            item.qty = newQty;
            renderCoffreStock();

            const authorName = currentUser ? currentUser.rpName : "Anonyme";
            const verb = action === 'plus' ? ("Ajout de " + delta + "x") : ("Retrait de " + delta + "x");
            const msg = verb + ' "' + item.name + '" (' + item.category + ') — Nouveau stock : ' + newQty;
            appendLocalLog("Coffre Commun", msg);

            syncWithGoogleSheets({
                action: "update_qty",
                sheetName: "Coffre",
                name: item.name,
                state: item.category || "Divers",
                qty: newQty,
                author: authorName,
                category: "Coffre Commun",
                actionText: msg
            });
        });
    });

    tbody.querySelectorAll('.delete-coffre-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetName = decodeURIComponent(e.currentTarget.dataset.name);
            const targetCat = decodeURIComponent(e.currentTarget.dataset.cat);

            const idx = coffreStock.findIndex(
                i => String(i.name).trim().toLowerCase() === targetName.trim().toLowerCase() &&
                     String(i.category || 'Divers').trim().toLowerCase() === targetCat.trim().toLowerCase()
            );
            if (idx === -1) return;
            const item = coffreStock[idx];

            if (confirm('Voulez-vous retirer définitivement "' + item.name + '" du Coffre Commun ?')) {
                coffreStock.splice(idx, 1);
                renderCoffreStock();

                const authorName = currentUser ? currentUser.rpName : "Anonyme";
                const msg = 'Suppression de "' + item.name + '" (' + item.category + ') du Coffre Commun.';
                appendLocalLog("Coffre Commun", msg);

                syncWithGoogleSheets({
                    action: "delete_item",
                    sheetName: "Coffre",
                    name: item.name,
                    state: item.category || "Divers",
                    author: authorName,
                    category: "Coffre Commun",
                    actionText: msg
                });
            }
        });
    });
}

document.getElementById('add-coffre-btn')?.addEventListener('click', () => {
    const select = document.getElementById('coffre-category');
    if (select && currentCoffreFilter !== "Toutes") {
        select.value = currentCoffreFilter;
    }
    document.getElementById('coffre-modal')?.classList.remove('hidden');
});

document.getElementById('coffre-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('coffre-category').value;
    const name = document.getElementById('coffre-name').value.trim();
    const qty = Math.max(1, parseInt(document.getElementById('coffre-qty').value) || 1);

    if (!name) return;

    document.getElementById('coffre-modal')?.classList.add('hidden');
    document.getElementById('coffre-form').reset();

    const authorName = currentUser ? currentUser.rpName : "Anonyme";

    const existing = coffreStock.find(
        i => String(i.name).trim().toLowerCase() === name.toLowerCase() &&
             String(i.category || 'Divers').trim().toLowerCase() === category.toLowerCase()
    );
    if (existing) {
        existing.qty = (parseInt(existing.qty) || 0) + qty;
    } else {
        coffreStock.push({ name: name, category: category, qty: qty });
    }
    renderCoffreStock();

    const msg = 'Dépôt dans le Coffre Commun : ' + qty + 'x "' + name + '" (' + category + ')';
    appendLocalLog("Coffre Commun", msg);

    syncWithGoogleSheets({
        action: "add_item",
        sheetName: "Coffre",
        name: name,
        state: category,
        qty: qty,
        author: authorName,
        category: "Coffre Commun",
        actionText: msg
    });
});

// --- GESTION DES RECETTES PAR ONGLET ---
function renderRecipes() {
    const categories = [
        { id: 'recipes-enchantement-body', name: 'Enchantement', job: 'enchanteur' },
        { id: 'recipes-alchimie-body', name: 'Alchimie', job: 'alchimiste' },
        { id: 'recipes-forge-body', name: 'Forge', job: 'forgeron' },
        { id: 'recipes-couture-body', name: 'Couture', job: 'couturier' }
    ];

    categories.forEach(cat => {
        const tbody = document.getElementById(cat.id);
        if (!tbody) return;

        const filtered = recipesList.filter(r => (r.type || r.category || 'Enchantement').toLowerCase() === cat.name.toLowerCase());

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucune recette enregistrée.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map((r) => {
            const globalIndex = recipesList.indexOf(r);
            const isAllowed = currentUser && (currentUser.job === cat.job);

            let actions = '-';
            if (isAllowed) {
                actions =
                    '<button type="button" class="skyrim-btn-small edit-recipe-btn" data-index="' + globalIndex + '" style="background:#2a2218; color:#ffd700;">Modifier</button>' +
                    '<button type="button" class="skyrim-btn-small delete-recipe-btn" data-index="' + globalIndex + '" style="background:#8b0000; color:#fff; margin-left:5px;">Supprimer</button>';
            }

            return '<tr>' +
                '<td><strong>' + r.name + '</strong></td>' +
                '<td>' + r.ingredients + '</td>' +
                '<td style="text-align:right;">' + actions + '</td>' +
            '</tr>';
        }).join('');
    });

    document.querySelectorAll('.edit-recipe-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.index;
            const recipe = recipesList[index];
            if (!recipe) return;

            document.getElementById('recipe-index').value = index;
            document.getElementById('recipe-category').value = recipe.type || recipe.category || 'Enchantement';
            document.getElementById('recipe-name').value = recipe.name;
            document.getElementById('recipe-ingredients').value = recipe.ingredients;
            document.getElementById('recipe-modal-title').textContent = "📜 Modifier la Recette";
            document.getElementById('recipe-modal').classList.remove('hidden');
        });
    });

    document.querySelectorAll('.delete-recipe-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.index;
            const recipe = recipesList[index];
            if (!recipe) return;

            if (confirm('Voulez-vous vraiment supprimer la recette "' + recipe.name + '" ?')) {
                const catName = recipe.type || recipe.category || "Enchantement";
                recipesList.splice(index, 1);
                renderRecipes();

                const msg = "Suppression de la recette : " + recipe.name;
                appendLocalLog(catName, msg);

                syncWithGoogleSheets({
                    action: "delete_recipe",
                    name: recipe.name,
                    author: currentUser ? currentUser.rpName : "Anonyme",
                    category: catName,
                    actionText: msg
                });
            }
        });
    });
}

document.querySelectorAll('.open-recipe-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const cat = e.currentTarget.getAttribute('data-category') || 'Enchantement';
        document.getElementById('recipe-index').value = "";
        document.getElementById('recipe-form').reset();
        document.getElementById('recipe-category').value = cat;
        document.getElementById('recipe-modal-title').textContent = "📜 Ajouter une Recette";
        document.getElementById('recipe-modal').classList.remove('hidden');
    });
});

document.getElementById('recipe-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = document.getElementById('recipe-index').value;
    const category = document.getElementById('recipe-category').value;
    const name = document.getElementById('recipe-name').value.trim();
    const ingredients = document.getElementById('recipe-ingredients').value.trim();

    document.getElementById('recipe-modal')?.classList.add('hidden');
    document.getElementById('recipe-form').reset();

    const isEditing = index !== "";
    if (isEditing && recipesList[index]) {
        recipesList[index] = { category: category, name: name, ingredients: ingredients };
    } else {
        recipesList.push({ category: category, name: name, ingredients: ingredients });
    }
    renderRecipes();

    const msg = (isEditing ? "Modification" : "Création") + ' de la recette : "' + name + '"';
    appendLocalLog(category, msg);

    syncWithGoogleSheets({
        action: isEditing ? "edit_recipe" : "add_recipe",
        index: index,
        category: category,
        name: name,
        ingredients: ingredients,
        author: currentUser ? currentUser.rpName : "Anonyme",
        actionText: msg
    });
});

// --- AJOUTS DE STOCK MÉTIERS ---
document.getElementById('add-gem-btn')?.addEventListener('click', () => document.getElementById('gem-modal')?.classList.remove('hidden'));
document.getElementById('gem-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('gem-name')?.value;
    const state = document.getElementById('gem-state')?.value;
    const qty = parseInt(document.getElementById('gem-qty')?.value) || 1;

    document.getElementById('gem-modal')?.classList.add('hidden');
    document.getElementById('gem-form')?.reset();

    const existing = gemsStock.find(g => g.name === name && g.state === state);
    if (existing) existing.qty = (parseInt(existing.qty) || 0) + qty;
    else gemsStock.push({ name: name, state: state, qty: qty });
    renderGenericStock('gems-unified-body', gemsStock, 'enchanteur', 'Gems');

    const msg = "Ajout gemme : " + qty + "x " + name + " (" + state + ")";
    appendLocalLog("Enchantement", msg);

    syncWithGoogleSheets({
        action: "add_gem",
        name: name,
        state: state,
        qty: qty,
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: "Enchantement",
        actionText: msg
    });
});

document.getElementById('add-ingredient-btn')?.addEventListener('click', () => document.getElementById('ingredient-modal')?.classList.remove('hidden'));
document.getElementById('ingredient-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('ing-name').value;
    const qty = parseInt(document.getElementById('ing-qty').value) || 1;

    document.getElementById('ingredient-modal')?.classList.add('hidden');
    document.getElementById('ingredient-form').reset();

    const existing = ingredientsStock.find(i => i.name === name);
    if (existing) existing.qty = (parseInt(existing.qty) || 0) + qty;
    else ingredientsStock.push({ name: name, qty: qty });
    renderGenericStock('ingredients-table-body', ingredientsStock, 'alchimiste', 'Ingredients');

    const msg = "Ajout ingrédient : " + qty + "x " + name;
    appendLocalLog("Alchimie", msg);

    syncWithGoogleSheets({
        action: "add_item",
        sheetName: "Ingredients",
        name: name,
        qty: qty,
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: "Alchimie",
        actionText: msg
    });
});

document.getElementById('add-forge-mat-btn')?.addEventListener('click', () => document.getElementById('forge-mat-modal')?.classList.remove('hidden'));
document.getElementById('forge-mat-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('fmat-name').value;
    const qty = parseInt(document.getElementById('fmat-qty').value) || 1;

    document.getElementById('forge-mat-modal')?.classList.add('hidden');
    document.getElementById('forge-mat-form').reset();

    const existing = forgeStock.find(f => f.name === name);
    if (existing) existing.qty = (parseInt(existing.qty) || 0) + qty;
    else forgeStock.push({ name: name, qty: qty });
    renderGenericStock('forge-materials-body', forgeStock, 'forgeron', 'Forge');

    const msg = "Ajout matériau forge : " + qty + "x " + name;
    appendLocalLog("Forge", msg);

    syncWithGoogleSheets({
        action: "add_item",
        sheetName: "Forge",
        name: name,
        qty: qty,
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: "Forge",
        actionText: msg
    });
});

document.getElementById('add-cloth-btn')?.addEventListener('click', () => document.getElementById('cloth-modal')?.classList.remove('hidden'));
document.getElementById('cloth-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cloth-name').value;
    const qty = parseInt(document.getElementById('cloth-qty').value) || 1;

    document.getElementById('cloth-modal')?.classList.add('hidden');
    document.getElementById('cloth-form').reset();

    const existing = clothStock.find(c => c.name === name);
    if (existing) existing.qty = (parseInt(existing.qty) || 0) + qty;
    else clothStock.push({ name: name, qty: qty });
    renderGenericStock('cloth-stock-body', clothStock, 'couturier', 'Couture');

    const msg = "Ajout étoffe : " + qty + "x " + name;
    appendLocalLog("Couture", msg);

    syncWithGoogleSheets({
        action: "add_item",
        sheetName: "Couture",
        name: name,
        qty: qty,
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: "Couture",
        actionText: msg
    });
});

// VENTES
document.querySelectorAll('.open-sale-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => document.getElementById('sale-modal')?.classList.remove('hidden'));
});

document.getElementById('sale-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = document.getElementById('sale-item').value;
    const amount = parseInt(document.getElementById('sale-amount').value) || 0;

    document.getElementById('sale-modal')?.classList.add('hidden');
    document.getElementById('sale-form').reset();

    const msg = 'Vente de "' + item + '" pour ' + amount + ' Septims.';
    appendLocalLog("Vente", msg);

    syncWithGoogleSheets({
        action: "record_sale",
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: "Vente",
        actionText: msg
    });
});

// FERMETURE DES MODALES
document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetModalId = e.currentTarget.getAttribute('data-target');
        if (targetModalId) document.getElementById(targetModalId)?.classList.add('hidden');
    });
});

// ENVOI DE DONNÉES À GOOGLE SHEETS
function syncWithGoogleSheets(data) {
    if (!GOOGLE_SHEET_URL) return;
    fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
    }).catch(err => console.error("Erreur de synchronisation Google Sheets :", err));
}

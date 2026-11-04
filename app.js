// --- URL WEBAPP GOOGLE SHEETS ---
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzc_tj4Uob5yJGJqnU1qvAyAt5MfKQ4Wkppm0hjneTkg813f3haSHMdePfADHN1V7om/exec";

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
        renderGenericStock('gems-unified-body', gemsStock, 'enchanteur', 'Gems');
        renderGenericStock('ingredients-table-body', ingredientsStock, 'alchimiste', 'Ingredients');
        renderGenericStock('forge-materials-body', forgeStock, 'forgeron', 'Forge');
        renderGenericStock('cloth-stock-body', clothStock, 'couturier', 'Couture');
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

// --- RENDU DES STOCKS AVEC CASE NUMÉRIQUE & BOUTONS +/- ---
function renderGenericStock(elementId, list, requiredRole, categoryName) {
    const tbody = document.getElementById(elementId);
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Stock vide.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map((item, i) => {
        const isAllowed = currentUser && (currentUser.job === requiredRole);
        
        let actionControls = `<strong>${item.qty}</strong>`;
        if (isAllowed) {
            actionControls = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button class="skyrim-btn-small qty-btn" data-action="minus" data-sheet="${categoryName}" data-index="${i}" style="background:#8b0000; color:#fff; padding:4px 10px;">-</button>
                    <input type="number" class="table-input qty-input" data-sheet="${categoryName}" data-index="${i}" value="${item.qty}" min="0">
                    <button class="skyrim-btn-small qty-btn" data-action="plus" data-sheet="${categoryName}" data-index="${i}" style="background:#006400; color:#fff; padding:4px 10px;">+</button>
                    <button class="skyrim-btn-small delete-item-btn" data-sheet="${categoryName}" data-index="${i}" title="Supprimer" style="background:#333; color:#ff4500; border-color:#ff4500; margin-left: 10px;">🗑️</button>
                </div>
            `;
        }

        return '<tr>' +
            '<td><strong>' + item.name + '</strong></td>' +
            '<td>' + (item.state ? '<span class="role-badge" style="color:' + (item.state === 'Pleine' ? '#ffd700' : '#8c8275') + ';">' + item.state + '</span>' : categoryName) + '</td>' +
            '<td>' + actionControls + '</td>' +
        '</tr>';
    }).join('');

    tbody.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = e.target.dataset.index;
            const sheetName = e.target.dataset.sheet;
            const action = e.target.dataset.action;
            let item = getStockListByName(sheetName)[index];
            if (!item) return;

            let newQty = parseInt(item.qty) + (action === 'plus' ? 1 : -1);
            if (newQty < 0) newQty = 0;

            await updateItemQuantity(sheetName, index, newQty, item);
        });
    });

    tbody.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('change', async (e) => {
            const index = e.target.dataset.index;
            const sheetName = e.target.dataset.sheet;
            let newQty = parseInt(e.target.value);
            if (isNaN(newQty) || newQty < 0) newQty = 0;

            let item = getStockListByName(sheetName)[index];
            if (!item) return;

            await updateItemQuantity(sheetName, index, newQty, item);
        });
    });

    tbody.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = e.target.dataset.index;
            const sheetName = e.target.dataset.sheet;
            let item = getStockListByName(sheetName)[index];
            if (!item) return;

            if (confirm(`Voulez-vous supprimer "${item.name}" du stock ?`)) {
                await syncWithGoogleSheets({
                    action: "delete_item",
                    sheetName: sheetName,
                    name: item.name,
                    author: currentUser ? currentUser.rpName : "Anonyme",
                    category: sheetName,
                    actionText: `Suppression de ${item.name} du stock.`
                });
                await loadDataFromGoogleSheets();
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

async function updateItemQuantity(sheetName, index, newQty, item) {
    await syncWithGoogleSheets({
        action: "update_qty",
        sheetName: sheetName,
        name: item.name,
        state: item.state || "",
        qty: newQty,
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: sheetName,
        actionText: `Quantité de ${item.name} modifiée à ${newQty}`
    });
    await loadDataFromGoogleSheets();
}

// --- GESTION UNIVERSELLE DES RECETTES PAR SÉPARATION D'ONGLETS ---
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

        // Filtrer les recettes correspondant strictement à la catégorie
        const filtered = recipesList.filter(r => (r.category || 'Enchantement').toLowerCase() === cat.name.toLowerCase());

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucune recette enregistrée.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map((r) => {
            // Retrouver l'index exact de la recette dans le tableau global recipesList
            const globalIndex = recipesList.indexOf(r);
            const isAllowed = currentUser && (currentUser.job === cat.job);
            
            let actions = '-';
            if (isAllowed) {
                actions = `
                    <button type="button" class="skyrim-btn-small edit-recipe-btn" data-index="${globalIndex}" style="background:#2a2218; color:#ffd700;">Modifier</button>
                    <button type="button" class="skyrim-btn-small delete-recipe-btn" data-index="${globalIndex}" style="background:#8b0000; color:#fff; margin-left:5px;">Supprimer</button>
                `;
            }

            return `<tr>
                <td><strong>${r.name}</strong></td>
                <td>${r.ingredients}</td>
                <td style="text-align:right;">${actions}</td>
            </tr>`;
        }).join('');
    });

    // Attacher les écouteurs sur les boutons Modifier nouvellement créés
    document.querySelectorAll('.edit-recipe-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.index;
            const recipe = recipesList[index];
            if (!recipe) return;

            document.getElementById('recipe-index').value = index;
            document.getElementById('recipe-category').value = recipe.category || 'Enchantement';
            document.getElementById('recipe-name').value = recipe.name;
            document.getElementById('recipe-ingredients').value = recipe.ingredients;
            document.getElementById('recipe-modal-title').textContent = "📜 Modifier la Recette";
            document.getElementById('recipe-modal').classList.remove('hidden');
        });
    });

    // Attacher les écouteurs sur les boutons Supprimer nouvellement créés
    document.querySelectorAll('.delete-recipe-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = e.currentTarget.dataset.index;
            const recipe = recipesList[index];
            if (!recipe) return;

            if (confirm(`Voulez-vous vraiment supprimer la recette "${recipe.name}" ?`)) {
                await syncWithGoogleSheets({
                    action: "delete_recipe",
                    name: recipe.name,
                    author: currentUser ? currentUser.rpName : "Anonyme",
                    category: recipe.category || "Enchantement",
                    actionText: `Suppression de la recette : ${recipe.name}`
                });
                await loadDataFromGoogleSheets();
            }
        });
    });
}

    document.querySelectorAll('.edit-recipe-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.target.dataset.index;
            const recipe = recipesList[index];
            if (!recipe) return;

            document.getElementById('recipe-index').value = index;
            document.getElementById('recipe-category').value = recipe.category || 'Enchantement';
            document.getElementById('recipe-name').value = recipe.name;
            document.getElementById('recipe-ingredients').value = recipe.ingredients;
            document.getElementById('recipe-modal-title').textContent = "📜 Modifier la Recette";
            document.getElementById('recipe-modal').classList.remove('hidden');
        });
    });

    document.querySelectorAll('.delete-recipe-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = e.target.dataset.index;
            const recipe = recipesList[index];
            if (!recipe) return;

            if (confirm(`Supprimer la recette "${recipe.name}" ?`)) {
                await syncWithGoogleSheets({
                    action: "delete_recipe",
                    name: recipe.name,
                    author: currentUser ? currentUser.rpName : "Anonyme",
                    category: recipe.category || "Général",
                    actionText: `Suppression de la recette : ${recipe.name}`
                });
                await loadDataFromGoogleSheets();
            }
        });
    });
}

document.querySelectorAll('.open-recipe-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const cat = e.target.getAttribute('data-category') || 'Enchantement';
        document.getElementById('recipe-index').value = "";
        document.getElementById('recipe-form').reset();
        document.getElementById('recipe-category').value = cat;
        document.getElementById('recipe-modal-title').textContent = "📜 Ajouter une Recette";
        document.getElementById('recipe-modal').classList.remove('hidden');
    });
});

document.getElementById('recipe-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const index = document.getElementById('recipe-index').value;
    const category = document.getElementById('recipe-category').value;
    const name = document.getElementById('recipe-name').value.trim();
    const ingredients = document.getElementById('recipe-ingredients').value.trim();

    document.getElementById('recipe-modal')?.classList.add('hidden');
    document.getElementById('recipe-form').reset();

    const isEditing = index !== "";

    await syncWithGoogleSheets({
        action: isEditing ? "edit_recipe" : "add_recipe",
        index: index,
        category: category,
        name: name,
        ingredients: ingredients,
        author: currentUser ? currentUser.rpName : "Anonyme",
        actionText: `${isEditing ? "Modification" : "Création"} de la recette : "${name}"`
    });

    await loadDataFromGoogleSheets();
});

// --- AJOUTS DE STOCK ---
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
        actionText: "Ajout gemme : " + qty + "x " + name + " (" + state + ")"
    });

    await loadDataFromGoogleSheets();
});

document.getElementById('add-ingredient-btn')?.addEventListener('click', () => document.getElementById('ingredient-modal')?.classList.remove('hidden'));
document.getElementById('ingredient-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('ing-name').value;
    const qty = parseInt(document.getElementById('ing-qty').value) || 1;

    document.getElementById('ingredient-modal')?.classList.add('hidden');
    document.getElementById('ingredient-form').reset();

    await syncWithGoogleSheets({
        action: "add_item",
        sheetName: "Ingredients",
        name: name,
        qty: qty,
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: "Alchimie",
        actionText: "Ajout ingrédient : " + qty + "x " + name
    });

    await loadDataFromGoogleSheets();
});

document.getElementById('add-forge-mat-btn')?.addEventListener('click', () => document.getElementById('forge-mat-modal')?.classList.remove('hidden'));
document.getElementById('forge-mat-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('fmat-name').value;
    const qty = parseInt(document.getElementById('fmat-qty').value) || 1;

    document.getElementById('forge-mat-modal')?.classList.add('hidden');
    document.getElementById('forge-mat-form').reset();

    await syncWithGoogleSheets({
        action: "add_item",
        sheetName: "Forge",
        name: name,
        qty: qty,
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: "Forge",
        actionText: "Ajout matériau forge : " + qty + "x " + name
    });

    await loadDataFromGoogleSheets();
});

document.getElementById('add-cloth-btn')?.addEventListener('click', () => document.getElementById('cloth-modal')?.classList.remove('hidden'));
document.getElementById('cloth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cloth-name').value;
    const qty = parseInt(document.getElementById('cloth-qty').value) || 1;

    document.getElementById('cloth-modal')?.classList.add('hidden');
    document.getElementById('cloth-form').reset();

    await syncWithGoogleSheets({
        action: "add_item",
        sheetName: "Couture",
        name: name,
        qty: qty,
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: "Couture",
        actionText: "Ajout étoffe : " + qty + "x " + name
    });

    await loadDataFromGoogleSheets();
});

// VENTES
document.querySelectorAll('.open-sale-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => document.getElementById('sale-modal')?.classList.remove('hidden'));
});

document.getElementById('sale-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = document.getElementById('sale-item').value;
    const amount = parseInt(document.getElementById('sale-amount').value) || 0;

    document.getElementById('sale-modal')?.classList.add('hidden');
    document.getElementById('sale-form').reset();

    await syncWithGoogleSheets({
        action: "record_sale",
        author: currentUser ? currentUser.rpName : "Anonyme",
        category: "Vente",
        actionText: "Vente de \"" + item + "\" pour " + amount + " Septims."
    });

    await loadDataFromGoogleSheets();
});

// FERMETURE DES MODALES
document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetModalId = btn.getAttribute('data-target');
        if (targetModalId) document.getElementById(targetModalId)?.classList.add('hidden');
    });
});

// ENVOI DE DONNÉES À GOOGLE SHEETS
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

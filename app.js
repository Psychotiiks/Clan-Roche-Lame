// --- URL WEBAPP GOOGLE SHEETS ---
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyOt9la5R2nxJLQ55d1-sgRU8sqcghclJsXGFz5m8gAXasV4SXtyBsa3gtfZVZlewND/exec"; //[cite: 2]

let currentUser = JSON.parse(localStorage.getItem('skyrim_current_user')) || null; //[cite: 2]
let membersList = []; //[cite: 2]
let activityLogs = []; //[cite: 2]
let gemsStock = []; //[cite: 2]
let recipesList = []; //[cite: 2]
let ingredientsStock = []; //[cite: 2]
let forgeStock = []; //[cite: 2]
let clothStock = []; //[cite: 2]
let coffreStock = [];
let currentCoffreFilter = "Toutes";

// --- NAVIGATION PAR ONGLETS ---
document.querySelectorAll('.tab-btn').forEach(btn => { //[cite: 2]
    btn.addEventListener('click', () => { //[cite: 2]
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); //[cite: 2]
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); //[cite: 2]
        btn.classList.add('active'); //[cite: 2]
        const targetTab = document.getElementById('tab-' + btn.dataset.tab); //[cite: 2]
        if (targetTab) targetTab.classList.add('active'); //[cite: 2]
    }); //[cite: 2]
}); //[cite: 2]

// --- CONNEXION DISCORD OAUTH2 ---
const DISCORD_OAUTH_URL = "https://discord.com/oauth2/authorize?client_id=1562350704058961990&response_type=code&redirect_uri=https%3A%2F%2Fpsychotiiks.github.io%2FClan-Roche-Lame%2F&scope=identify"; //[cite: 2]

document.getElementById('discord-login-btn')?.addEventListener('click', () => { //[cite: 2]
    window.location.href = DISCORD_OAUTH_URL; //[cite: 2]
}); //[cite: 2]

// --- DÉCONNEXION ---
document.getElementById('logout-btn')?.addEventListener('click', () => { //[cite: 2]
    localStorage.removeItem('skyrim_current_user'); //[cite: 2]
    currentUser = null; //[cite: 2]
    window.location.reload(); //[cite: 2]
}); //[cite: 2]

// --- INITIALISATION DE LA PAGE ---
document.addEventListener('DOMContentLoaded', async () => { //[cite: 2]
    if (currentUser) { //[cite: 2]
        updateUserUI(); //[cite: 2]
    } //[cite: 2]

    const urlParams = new URLSearchParams(window.location.search); //[cite: 2]
    const code = urlParams.get('code'); //[cite: 2]

    if (code) { //[cite: 2]
        window.history.replaceState({}, document.title, window.location.pathname); //[cite: 2]
        if (!currentUser) { //[cite: 2]
            document.getElementById('registration-modal')?.classList.remove('hidden'); //[cite: 2]
        } //[cite: 2]
    } //[cite: 2]

    await loadDataFromGoogleSheets(); //[cite: 2]
}); //[cite: 2]

async function loadDataFromGoogleSheets() { //[cite: 2]
    if (!GOOGLE_SHEET_URL) return; //[cite: 2]
    try { //[cite: 2]
        const response = await fetch(GOOGLE_SHEET_URL + "?t=" + Date.now());
        const data = await response.json(); //[cite: 2]

        membersList = data.members || []; //[cite: 2]
        gemsStock = data.gems || []; //[cite: 2]
        recipesList = data.recipes || []; //[cite: 2]
        activityLogs = data.logs || []; //[cite: 2]
        ingredientsStock = data.ingredients || []; //[cite: 2]
        forgeStock = data.forge || []; //[cite: 2]
        clothStock = data.cloth || []; //[cite: 2]
        coffreStock = data.coffre || [];

        renderMembers(); //[cite: 2]
        renderGenericStock('gems-unified-body', gemsStock, 'enchanteur', 'Gems'); //[cite: 2]
        renderGenericStock('ingredients-table-body', ingredientsStock, 'alchimiste', 'Ingredients'); //[cite: 2]
        renderGenericStock('forge-materials-body', forgeStock, 'forgeron', 'Forge'); //[cite: 2]
        renderGenericStock('cloth-stock-body', clothStock, 'couturier', 'Couture'); //[cite: 2]
        renderCoffreStock();
        renderRecipes(); //[cite: 2]
        renderActivityLog(); //[cite: 2]
    } catch (err) { //[cite: 2]
        console.error("Erreur de chargement Google Sheets :", err); //[cite: 2]
    } //[cite: 2]
} //[cite: 2]

// --- INSCRIPTION ---
document.getElementById('registration-form')?.addEventListener('submit', async (e) => { //[cite: 2]
    e.preventDefault(); //[cite: 2]
    const rpName = document.getElementById('rp-name').value.trim(); //[cite: 2]
    const rpJob = document.getElementById('rp-job').value; //[cite: 2]

    if (!rpName) return; //[cite: 2]

    currentUser = { //[cite: 2]
        rpName: rpName, //[cite: 2]
        job: rpJob, //[cite: 2]
        joinedAt: new Date().toLocaleDateString('fr-FR') //[cite: 2]
    }; //[cite: 2]

    localStorage.setItem('skyrim_current_user', JSON.stringify(currentUser)); //[cite: 2]
    document.getElementById('registration-modal')?.classList.add('hidden'); //[cite: 2]

    updateUserUI(); //[cite: 2]

    await syncWithGoogleSheets({ //[cite: 2]
        action: "register_member", //[cite: 2]
        rpName: rpName, //[cite: 2]
        job: rpJob, //[cite: 2]
        date: currentUser.joinedAt, //[cite: 2]
        author: rpName, //[cite: 2]
        category: "Inscription", //[cite: 2]
        actionText: rpName + " a rejoint le clan en tant que " + rpJob + "." //[cite: 2]
    }); //[cite: 2]

    await loadDataFromGoogleSheets(); //[cite: 2]
}); //[cite: 2]

function updateUserUI() { //[cite: 2]
    if (!currentUser) return; //[cite: 2]

    const loginBtn = document.getElementById('discord-login-btn'); //[cite: 2]
    const userProfile = document.getElementById('user-profile'); //[cite: 2]
    const userName = document.getElementById('user-name'); //[cite: 2]
    const addCoffreBtn = document.getElementById('add-coffre-btn');

    if (loginBtn) loginBtn.classList.add('hidden'); //[cite: 2]
    if (userProfile) userProfile.classList.remove('hidden'); //[cite: 2]
    if (userName) userName.textContent = currentUser.rpName + " (" + currentUser.job + ")"; //[cite: 2]
    if (addCoffreBtn) addCoffreBtn.classList.remove('hidden');

    document.querySelectorAll('.role-restricted').forEach(btn => { //[cite: 2]
        const requiredRole = btn.getAttribute('data-role'); //[cite: 2]
        if (requiredRole && currentUser.job === requiredRole) { //[cite: 2]
            btn.classList.remove('hidden'); //[cite: 2]
        } else { //[cite: 2]
            btn.classList.add('hidden'); //[cite: 2]
        } //[cite: 2]
    }); //[cite: 2]
} //[cite: 2]

function renderMembers() { //[cite: 2]
    const tbody = document.getElementById('members-list'); //[cite: 2]
    if (!tbody) return; //[cite: 2]
    if (membersList.length === 0) { //[cite: 2]
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucun membre inscrit.</td></tr>'; //[cite: 2]
        return; //[cite: 2]
    } //[cite: 2]
    tbody.innerHTML = '<thead><tr><th>Nom RP</th><th>Rôle / Métier</th><th>Date d\'inscription</th></tr></thead><tbody>' + //[cite: 2]
        membersList.map(m => '<tr><td><strong>' + (m.rpName || '-') + '</strong></td><td><span class="role-badge">' + (m.job || '-') + '</span></td><td>' + (m.joinedAt || '-') + '</td></tr>').join('') + //[cite: 2]
        '</tbody>'; //[cite: 2]
} //[cite: 2]

function renderActivityLog() { //[cite: 2]
    const tbody = document.getElementById('activity-log-body'); //[cite: 2]
    if (!tbody) return; //[cite: 2]
    if (activityLogs.length === 0) { //[cite: 2]
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aucune activité.</td></tr>'; //[cite: 2]
        return; //[cite: 2]
    } //[cite: 2]
    tbody.innerHTML = activityLogs.map(log => //[cite: 2]
        '<tr><td>' + (log.date || '-') + '</td><td><strong>' + (log.author || 'Anonyme') + '</strong></td><td><span class="role-badge">' + (log.category || 'Général') + '</span></td><td>' + (log.action || '-') + '</td></tr>' //[cite: 2]
    ).join(''); //[cite: 2]
} //[cite: 2]

// --- RENDU DES STOCKS MÉTIERS (MODIFICATION PAR AJOUT/RETRAIT PRÉCIS) ---
function renderGenericStock(elementId, list, requiredRole, categoryName) { //[cite: 2]
    const tbody = document.getElementById(elementId); //[cite: 2]
    if (!tbody) return; //[cite: 2]

    if (!list || list.length === 0) { //[cite: 2]
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Stock vide.</td></tr>'; //[cite: 2]
        return; //[cite: 2]
    } //[cite: 2]

    tbody.innerHTML = list.map((item, i) => { //[cite: 2]
        const isAllowed = currentUser && (currentUser.job === requiredRole); //[cite: 2]

        let stockDisplay = `<strong style="font-size: 1.1em; color: #ffd700;">${item.qty}</strong>`; //[cite: 2]

        let actionControls = `<span style="color: #8c8275; font-style: italic;">Lecture seule</span>`; //[cite: 2]
        if (isAllowed) { //[cite: 2]
            actionControls = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button type="button" class="skyrim-btn-small qty-action-btn" data-action="minus" data-sheet="${categoryName}" data-index="${i}" style="background:#8b0000; color:#fff; padding:4px 10px;" title="Retirer cette quantité">-</button>
                    <input type="number" class="table-input qty-delta-input" data-sheet="${categoryName}" data-index="${i}" value="1" min="1" style="width: 60px; text-align: center;" title="Quantité à ajouter/retirer">
                    <button type="button" class="skyrim-btn-small qty-action-btn" data-action="plus" data-sheet="${categoryName}" data-index="${i}" style="background:#006400; color:#fff; padding:4px 10px;" title="Ajouter cette quantité">+</button>
                    <button type="button" class="skyrim-btn-small delete-item-btn" data-sheet="${categoryName}" data-index="${i}" title="Supprimer l'élément" style="background:#333; color:#ff4500; border-color:#ff4500; margin-left: 10px;">🗑️</button>
                </div>
            `; //[cite: 2]
        } //[cite: 2]

        return '<tr>' + //[cite: 2]
            '<td><strong>' + item.name + '</strong></td>' + //[cite: 2]
            '<td>' + (item.state ? '<span class="role-badge" style="color:' + (item.state === 'Pleine' ? '#ffd700' : '#8c8275') + ';">' + item.state + '</span>' : categoryName) + '</td>' + //[cite: 2]
            '<td style="text-align: center;">' + stockDisplay + '</td>' + //[cite: 2]
            '<td>' + actionControls + '</td>' + //[cite: 2]
        '</tr>'; //[cite: 2]
    }).join(''); //[cite: 2]

    tbody.querySelectorAll('.qty-action-btn').forEach(btn => { //[cite: 2]
        btn.addEventListener('click', async (e) => { //[cite: 2]
            const index = e.currentTarget.dataset.index; //[cite: 2]
            const sheetName = e.currentTarget.dataset.sheet; //[cite: 2]
            const action = e.currentTarget.dataset.action; //[cite: 2]

            let item = getStockListByName(sheetName)[index]; //[cite: 2]
            if (!item) return; //[cite: 2]

            const row = e.currentTarget.closest('tr'); //[cite: 2]
            const deltaInput = row.querySelector('.qty-delta-input'); //[cite: 2]
            const delta = parseInt(deltaInput.value) || 1; //[cite: 2]

            let currentQty = parseInt(item.qty) || 0; //[cite: 2]
            let newQty = action === 'plus' ? (currentQty + delta) : (currentQty - delta); //[cite: 2]
            if (newQty < 0) newQty = 0; //[cite: 2]

            await updateItemQuantity(sheetName, index, newQty, item); //[cite: 2]
        }); //[cite: 2]
    }); //[cite: 2]

    tbody.querySelectorAll('.delete-item-btn').forEach(btn => { //[cite: 2]
        btn.addEventListener('click', async (e) => { //[cite: 2]
            const index = e.currentTarget.dataset.index; //[cite: 2]
            const sheetName = e.currentTarget.dataset.sheet; //[cite: 2]
            let item = getStockListByName(sheetName)[index]; //[cite: 2]
            if (!item) return; //[cite: 2]

            if (confirm(`Voulez-vous supprimer "${item.name}" du stock ?`)) { //[cite: 2]
                await syncWithGoogleSheets({ //[cite: 2]
                    action: "delete_item", //[cite: 2]
                    sheetName: sheetName, //[cite: 2]
                    name: item.name, //[cite: 2]
                    author: currentUser ? currentUser.rpName : "Anonyme", //[cite: 2]
                    category: sheetName, //[cite: 2]
                    actionText: `Suppression de ${item.name} du stock.` //[cite: 2]
                }); //[cite: 2]
                await loadDataFromGoogleSheets(); //[cite: 2]
            } //[cite: 2]
        }); //[cite: 2]
    }); //[cite: 2]
} //[cite: 2]

function getStockListByName(sheetName) { //[cite: 2]
    if (sheetName === 'Gems') return gemsStock; //[cite: 2]
    if (sheetName === 'Ingredients') return ingredientsStock; //[cite: 2]
    if (sheetName === 'Forge') return forgeStock; //[cite: 2]
    if (sheetName === 'Couture') return clothStock; //[cite: 2]
    return []; //[cite: 2]
} //[cite: 2]

async function updateItemQuantity(sheetName, index, newQty, item) { //[cite: 2]
    await syncWithGoogleSheets({ //[cite: 2]
        action: "update_qty", //[cite: 2]
        sheetName: sheetName, //[cite: 2]
        name: item.name, //[cite: 2]
        state: item.state || "", //[cite: 2]
        qty: newQty, //[cite: 2]
        author: currentUser ? currentUser.rpName : "Anonyme", //[cite: 2]
        category: sheetName, //[cite: 2]
        actionText: `Quantité de ${item.name} modifiée à ${newQty}` //[cite: 2]
    }); //[cite: 2]
    await loadDataFromGoogleSheets(); //[cite: 2]
} //[cite: 2]

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
                : `📦 Coffre Commun — Catégorie : ${currentCoffreFilter}`;
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
        const globalIndex = coffreStock.indexOf(item);
        const isConnected = !!currentUser;

        let stockDisplay = `<strong style="font-size: 1.1em; color: #ffd700;">${item.qty}</strong>`;
        let actionControls = `<span style="color: #8c8275; font-style: italic;">Connectez-vous pour interagir</span>`;

        if (isConnected) {
            actionControls = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button type="button" class="skyrim-btn-small coffre-qty-btn" data-action="minus" data-index="${globalIndex}" style="background:#8b0000; color:#fff; padding:4px 10px;" title="Retirer cette quantité">-</button>
                    <input type="number" class="table-input coffre-delta-input" value="1" min="1" style="width: 65px; text-align: center;" title="Quantité à ajouter/retirer">
                    <button type="button" class="skyrim-btn-small coffre-qty-btn" data-action="plus" data-index="${globalIndex}" style="background:#006400; color:#fff; padding:4px 10px;" title="Ajouter cette quantité">+</button>
                    <button type="button" class="skyrim-btn-small delete-coffre-btn" data-index="${globalIndex}" title="Supprimer l'objet" style="background:#333; color:#ff4500; border-color:#ff4500; margin-left: 10px;">🗑️</button>
                </div>
            `;
        }

        return `<tr>
            <td><strong>${item.name}</strong></td>
            <td><span class="role-badge">${item.category || 'Divers'}</span></td>
            <td style="text-align: center;">${stockDisplay}</td>
            <td>${actionControls}</td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.coffre-qty-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = e.currentTarget.dataset.index;
            const action = e.currentTarget.dataset.action;
            const item = coffreStock[index];
            if (!item) return;

            const row = e.currentTarget.closest('tr');
            const deltaInput = row.querySelector('.coffre-delta-input');
            const delta = parseInt(deltaInput.value) || 1;

            let currentQty = parseInt(item.qty) || 0;
            let newQty = action === 'plus' ? (currentQty + delta) : (currentQty - delta);
            if (newQty < 0) newQty = 0;

            item.qty = newQty;
            renderCoffreStock();

            const authorName = currentUser ? currentUser.rpName : "Anonyme";
            const verb = action === 'plus' ? `Ajout de ${delta}x` : `Retrait de ${delta}x`;

            await syncWithGoogleSheets({
                action: "update_qty",
                sheetName: "Coffre",
                name: item.name,
                state: item.category || "Divers",
                qty: newQty,
                author: authorName,
                category: "Coffre Commun",
                actionText: `${verb} "${item.name}" (${item.category}) — Nouveau stock : ${newQty}`
            });

            await loadDataFromGoogleSheets();
        });
    });

    tbody.querySelectorAll('.delete-coffre-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = e.currentTarget.dataset.index;
            const item = coffreStock[index];
            if (!item) return;

            if (confirm(`Voulez-vous retirer définitivement "${item.name}" du Coffre Commun ?`)) {
                coffreStock.splice(index, 1);
                renderCoffreStock();

                const authorName = currentUser ? currentUser.rpName : "Anonyme";
                await syncWithGoogleSheets({
                    action: "delete_item",
                    sheetName: "Coffre",
                    name: item.name,
                    state: item.category || "Divers",
                    author: authorName,
                    category: "Coffre Commun",
                    actionText: `Suppression de "${item.name}" (${item.category}) du Coffre Commun.`
                });
                await loadDataFromGoogleSheets();
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

document.getElementById('coffre-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('coffre-category').value;
    const name = document.getElementById('coffre-name').value.trim();
    const qty = parseInt(document.getElementById('coffre-qty').value) || 1;

    if (!name) return;

    document.getElementById('coffre-modal')?.classList.add('hidden');
    document.getElementById('coffre-form').reset();

    const authorName = currentUser ? currentUser.rpName : "Anonyme";

    const existing = coffreStock.find(
        i => i.name.toLowerCase() === name.toLowerCase() &&
             (i.category || 'Divers').toLowerCase() === category.toLowerCase()
    );
    if (existing) {
        existing.qty = (parseInt(existing.qty) || 0) + qty;
    } else {
        coffreStock.push({ name: name, category: category, qty: qty });
    }
    renderCoffreStock();

    await syncWithGoogleSheets({
        action: "add_item",
        sheetName: "Coffre",
        name: name,
        state: category,
        qty: qty,
        author: authorName,
        category: "Coffre Commun",
        actionText: `Dépôt dans le Coffre Commun : ${qty}x "${name}" (${category})`
    });

    if (!GOOGLE_SHEET_URL) return;
    try {
        const response = await fetch(GOOGLE_SHEET_URL + "?t=" + Date.now());
        const data = await response.json();
        if (Array.isArray(data.coffre) && data.coffre.length > 0) {
            coffreStock = data.coffre;
            renderCoffreStock();
        }
        activityLogs = data.logs || activityLogs;
        renderActivityLog();
    } catch (err) {
        console.error("Erreur de rechargement après ajout :", err);
    }
});

// --- GESTION DES RECETTES PAR ONGLET ---
function renderRecipes() { //[cite: 2]
    const categories = [ //[cite: 2]
        { id: 'recipes-enchantement-body', name: 'Enchantement', job: 'enchanteur' }, //[cite: 2]
        { id: 'recipes-alchimie-body', name: 'Alchimie', job: 'alchimiste' }, //[cite: 2]
        { id: 'recipes-forge-body', name: 'Forge', job: 'forgeron' }, //[cite: 2]
        { id: 'recipes-couture-body', name: 'Couture', job: 'couturier' } //[cite: 2]
    ]; //[cite: 2]

    categories.forEach(cat => { //[cite: 2]
        const tbody = document.getElementById(cat.id); //[cite: 2]
        if (!tbody) return; //[cite: 2]

        const filtered = recipesList.filter(r => (r.type || r.category || 'Enchantement').toLowerCase() === cat.name.toLowerCase()); //[cite: 2]

        if (filtered.length === 0) { //[cite: 2]
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucune recette enregistrée.</td></tr>'; //[cite: 2]
            return; //[cite: 2]
        } //[cite: 2]

        tbody.innerHTML = filtered.map((r) => { //[cite: 2]
            const globalIndex = recipesList.indexOf(r); //[cite: 2]
            const isAllowed = currentUser && (currentUser.job === cat.job); //[cite: 2]

            let actions = '-'; //[cite: 2]
            if (isAllowed) { //[cite: 2]
                actions = `
                    <button type="button" class="skyrim-btn-small edit-recipe-btn" data-index="${globalIndex}" style="background:#2a2218; color:#ffd700;">Modifier</button>
                    <button type="button" class="skyrim-btn-small delete-recipe-btn" data-index="${globalIndex}" style="background:#8b0000; color:#fff; margin-left:5px;">Supprimer</button>
                `; //[cite: 2]
            } //[cite: 2]

            return `<tr>
                <td><strong>${r.name}</strong></td>
                <td>${r.ingredients}</td>
                <td style="text-align:right;">${actions}</td>
            </tr>`; //[cite: 2]
        }).join(''); //[cite: 2]
    }); //[cite: 2]

    document.querySelectorAll('.edit-recipe-btn').forEach(btn => { //[cite: 2]
        btn.addEventListener('click', (e) => { //[cite: 2]
            const index = e.currentTarget.dataset.index; //[cite: 2]
            const recipe = recipesList[index]; //[cite: 2]
            if (!recipe) return; //[cite: 2]

            document.getElementById('recipe-index').value = index; //[cite: 2]
            document.getElementById('recipe-category').value = recipe.type || recipe.category || 'Enchantement'; //[cite: 2]
            document.getElementById('recipe-name').value = recipe.name; //[cite: 2]
            document.getElementById('recipe-ingredients').value = recipe.ingredients; //[cite: 2]
            document.getElementById('recipe-modal-title').textContent = "📜 Modifier la Recette"; //[cite: 2]
            document.getElementById('recipe-modal').classList.remove('hidden'); //[cite: 2]
        }); //[cite: 2]
    }); //[cite: 2]

    document.querySelectorAll('.delete-recipe-btn').forEach(btn => { //[cite: 2]
        btn.addEventListener('click', async (e) => { //[cite: 2]
            const index = e.currentTarget.dataset.index; //[cite: 2]
            const recipe = recipesList[index]; //[cite: 2]
            if (!recipe) return; //[cite: 2]

            if (confirm(`Voulez-vous vraiment supprimer la recette "${recipe.name}" ?`)) { //[cite: 2]
                await syncWithGoogleSheets({ //[cite: 2]
                    action: "delete_recipe", //[cite: 2]
                    name: recipe.name, //[cite: 2]
                    author: currentUser ? currentUser.rpName : "Anonyme", //[cite: 2]
                    category: recipe.type || recipe.category || "Enchantement", //[cite: 2]
                    actionText: `Suppression de la recette : ${recipe.name}` //[cite: 2]
                }); //[cite: 2]
                await loadDataFromGoogleSheets(); //[cite: 2]
            } //[cite: 2]
        }); //[cite: 2]
    }); //[cite: 2]
} //[cite: 2]

document.querySelectorAll('.open-recipe-modal-btn').forEach(btn => { //[cite: 2]
    btn.addEventListener('click', (e) => { //[cite: 2]
        const cat = e.currentTarget.getAttribute('data-category') || 'Enchantement'; //[cite: 2]
        document.getElementById('recipe-index').value = ""; //[cite: 2]
        document.getElementById('recipe-form').reset(); //[cite: 2]
        document.getElementById('recipe-category').value = cat; //[cite: 2]
        document.getElementById('recipe-modal-title').textContent = "📜 Ajouter une Recette"; //[cite: 2]
        document.getElementById('recipe-modal').classList.remove('hidden'); //[cite: 2]
    }); //[cite: 2]
}); //[cite: 2]

document.getElementById('recipe-form')?.addEventListener('submit', async (e) => { //[cite: 2]
    e.preventDefault(); //[cite: 2]
    const index = document.getElementById('recipe-index').value; //[cite: 2]
    const category = document.getElementById('recipe-category').value; //[cite: 2]
    const name = document.getElementById('recipe-name').value.trim(); //[cite: 2]
    const ingredients = document.getElementById('recipe-ingredients').value.trim(); //[cite: 2]

    document.getElementById('recipe-modal')?.classList.add('hidden'); //[cite: 2]
    document.getElementById('recipe-form').reset(); //[cite: 2]

    const isEditing = index !== ""; //[cite: 2]

    await syncWithGoogleSheets({ //[cite: 2]
        action: isEditing ? "edit_recipe" : "add_recipe", //[cite: 2]
        index: index, //[cite: 2]
        category: category, //[cite: 2]
        name: name, //[cite: 2]
        ingredients: ingredients, //[cite: 2]
        author: currentUser ? currentUser.rpName : "Anonyme", //[cite: 2]
        actionText: `${isEditing ? "Modification" : "Création"} de la recette : "${name}"` //[cite: 2]
    }); //[cite: 2]

    await loadDataFromGoogleSheets(); //[cite: 2]
}); //[cite: 2]

// --- AJOUTS DE STOCK MÉTIERS ---
document.getElementById('add-gem-btn')?.addEventListener('click', () => document.getElementById('gem-modal')?.classList.remove('hidden')); //[cite: 2]
document.getElementById('gem-form')?.addEventListener('submit', async (e) => { //[cite: 2]
    e.preventDefault(); //[cite: 2]
    const name = document.getElementById('gem-name')?.value; //[cite: 2]
    const state = document.getElementById('gem-state')?.value; //[cite: 2]
    const qty = parseInt(document.getElementById('gem-qty')?.value) || 1; //[cite: 2]

    document.getElementById('gem-modal')?.classList.add('hidden'); //[cite: 2]
    document.getElementById('gem-form')?.reset(); //[cite: 2]

    await syncWithGoogleSheets({ //[cite: 2]
        action: "add_gem", //[cite: 2]
        name: name, //[cite: 2]
        state: state, //[cite: 2]
        qty: qty, //[cite: 2]
        author: currentUser ? currentUser.rpName : "Anonyme", //[cite: 2]
        category: "Enchantement", //[cite: 2]
        actionText: "Ajout gemme : " + qty + "x " + name + " (" + state + ")" //[cite: 2]
    }); //[cite: 2]

    await loadDataFromGoogleSheets(); //[cite: 2]
}); //[cite: 2]

document.getElementById('add-ingredient-btn')?.addEventListener('click', () => document.getElementById('ingredient-modal')?.classList.remove('hidden')); //[cite: 2]
document.getElementById('ingredient-form')?.addEventListener('submit', async (e) => { //[cite: 2]
    e.preventDefault(); //[cite: 2]
    const name = document.getElementById('ing-name').value; //[cite: 2]
    const qty = parseInt(document.getElementById('ing-qty').value) || 1; //[cite: 2]

    document.getElementById('ingredient-modal')?.classList.add('hidden'); //[cite: 2]
    document.getElementById('ingredient-form').reset(); //[cite: 2]

    await syncWithGoogleSheets({ //[cite: 2]
        action: "add_item", //[cite: 2]
        sheetName: "Ingredients", //[cite: 2]
        name: name, //[cite: 2]
        qty: qty, //[cite: 2]
        author: currentUser ? currentUser.rpName : "Anonyme", //[cite: 2]
        category: "Alchimie", //[cite: 2]
        actionText: "Ajout ingrédient : " + qty + "x " + name //[cite: 2]
    }); //[cite: 2]

    await loadDataFromGoogleSheets(); //[cite: 2]
}); //[cite: 2]

document.getElementById('add-forge-mat-btn')?.addEventListener('click', () => document.getElementById('forge-mat-modal')?.classList.remove('hidden')); //[cite: 2]
document.getElementById('forge-mat-form')?.addEventListener('submit', async (e) => { //[cite: 2]
    e.preventDefault(); //[cite: 2]
    const name = document.getElementById('fmat-name').value; //[cite: 2]
    const qty = parseInt(document.getElementById('fmat-qty').value) || 1; //[cite: 2]

    document.getElementById('forge-mat-modal')?.classList.add('hidden'); //[cite: 2]
    document.getElementById('forge-mat-form').reset(); //[cite: 2]

    await syncWithGoogleSheets({ //[cite: 2]
        action: "add_item", //[cite: 2]
        sheetName: "Forge", //[cite: 2]
        name: name, //[cite: 2]
        qty: qty, //[cite: 2]
        author: currentUser ? currentUser.rpName : "Anonyme", //[cite: 2]
        category: "Forge", //[cite: 2]
        actionText: "Ajout matériau forge : " + qty + "x " + name //[cite: 2]
    }); //[cite: 2]

    await loadDataFromGoogleSheets(); //[cite: 2]
}); //[cite: 2]

document.getElementById('add-cloth-btn')?.addEventListener('click', () => document.getElementById('cloth-modal')?.classList.remove('hidden')); //[cite: 2]
document.getElementById('cloth-form')?.addEventListener('submit', async (e) => { //[cite: 2]
    e.preventDefault(); //[cite: 2]
    const name = document.getElementById('cloth-name').value; //[cite: 2]
    const qty = parseInt(document.getElementById('cloth-qty').value) || 1; //[cite: 2]

    document.getElementById('cloth-modal')?.classList.add('hidden'); //[cite: 2]
    document.getElementById('cloth-form').reset(); //[cite: 2]

    await syncWithGoogleSheets({ //[cite: 2]
        action: "add_item", //[cite: 2]
        sheetName: "Couture", //[cite: 2]
        name: name, //[cite: 2]
        qty: qty, //[cite: 2]
        author: currentUser ? currentUser.rpName : "Anonyme", //[cite: 2]
        category: "Couture", //[cite: 2]
        actionText: "Ajout étoffe : " + qty + "x " + name //[cite: 2]
    }); //[cite: 2]

    await loadDataFromGoogleSheets(); //[cite: 2]
}); //[cite: 2]

// VENTES
document.querySelectorAll('.open-sale-modal-btn').forEach(btn => { //[cite: 2]
    btn.addEventListener('click', () => document.getElementById('sale-modal')?.classList.remove('hidden')); //[cite: 2]
}); //[cite: 2]

document.getElementById('sale-form')?.addEventListener('submit', async (e) => { //[cite: 2]
    e.preventDefault(); //[cite: 2]
    const item = document.getElementById('sale-item').value; //[cite: 2]
    const amount = parseInt(document.getElementById('sale-amount').value) || 0; //[cite: 2]

    document.getElementById('sale-modal')?.classList.add('hidden'); //[cite: 2]
    document.getElementById('sale-form').reset(); //[cite: 2]

    await syncWithGoogleSheets({ //[cite: 2]
        action: "record_sale", //[cite: 2]
        author: currentUser ? currentUser.rpName : "Anonyme", //[cite: 2]
        category: "Vente", //[cite: 2]
        actionText: "Vente de \"" + item + "\" pour " + amount + " Septims." //[cite: 2]
    }); //[cite: 2]

    await loadDataFromGoogleSheets(); //[cite: 2]
}); //[cite: 2]

// FERMETURE DES MODALES
document.querySelectorAll('.close-modal-btn').forEach(btn => { //[cite: 2]
    btn.addEventListener('click', (e) => { //[cite: 2]
        const targetModalId = e.currentTarget.getAttribute('data-target'); //[cite: 2]
        if (targetModalId) document.getElementById(targetModalId)?.classList.add('hidden'); //[cite: 2]
    }); //[cite: 2]
}); //[cite: 2]

// ENVOI DE DONNÉES À GOOGLE SHEETS
async function syncWithGoogleSheets(data) { //[cite: 2]
    if (!GOOGLE_SHEET_URL) return; //[cite: 2]
    try { //[cite: 2]
        await fetch(GOOGLE_SHEET_URL, { //[cite: 2]
            method: 'POST', //[cite: 2]
            mode: 'no-cors', //[cite: 2]
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data) //[cite: 2]
        }); //[cite: 2]
        await new Promise(resolve => setTimeout(resolve, 800));
    } catch (err) { //[cite: 2]
        console.error("Erreur de synchronisation Google Sheets :", err); //[cite: 2]
    } //[cite: 2]
} //[cite: 2]

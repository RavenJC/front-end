// API Configuration
const API = {
    AUTH: 'https://users-gh1g.onrender.com/api/auth',
    PRODUCTS: 'https://product-1-fdvq.onrender.com/api/products',
    CART: 'https://cart-mjf8.onrender.com/api/cart',
    WISHLIST: 'https://cart-mjf8.onrender.com/api/wishlist',
    ORDERS: 'https://order-tepx.onrender.com/api/orders'
};

// State Management
let currentUser = null;
let authToken = null;
let cart = null;
let wishlist = null;
let allProducts = [];
let categories = new Set();
let currentEditingProduct = null;
let currentEditingOrder = null;
let currentSlide = 0;
let sliderInterval = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initPageLoader();
    initSlider();
    initCountdown();
    checkAuth();
    setupEventListeners();
    loadProducts();
});

// Page Loader
function initPageLoader() {
    const loader = document.getElementById('pageLoader');
    window.addEventListener('load', () => {
        setTimeout(() => loader.classList.add('hidden'), 800);
    });
}

// Hero Slider
function initSlider() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');
    if (!slides.length) return;
    
    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        currentSlide = (index + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }
    
    prevBtn?.addEventListener('click', () => { showSlide(currentSlide - 1); resetInterval(); });
    nextBtn?.addEventListener('click', () => { showSlide(currentSlide + 1); resetInterval(); });
    dots.forEach((dot, i) => dot.addEventListener('click', () => { showSlide(i); resetInterval(); }));
    
    function resetInterval() { clearInterval(sliderInterval); sliderInterval = setInterval(() => showSlide(currentSlide + 1), 5000); }
    sliderInterval = setInterval(() => showSlide(currentSlide + 1), 5000);
}

// Countdown Timer
function initCountdown() {
    const h = document.getElementById('hours'), m = document.getElementById('minutes'), s = document.getElementById('seconds');
    if (!h) return;
    let total = 8 * 3600 + 45 * 60 + 30;
    setInterval(() => {
        h.textContent = String(Math.floor(total / 3600)).padStart(2, '0');
        m.textContent = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
        s.textContent = String(total % 60).padStart(2, '0');
        total = total > 0 ? total - 1 : 86400;
    }, 1000);
}

// Check Auth
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    if (token && user) { authToken = token; currentUser = JSON.parse(user); updateAuthUI(); loadUserData(); }
}

// Update Auth UI
function updateAuthUI() {
    const topAuthLink = document.getElementById('topAuthLink');
    const adminNavLink = document.getElementById('adminNavLink');
    
    if (currentUser) {
        topAuthLink.innerHTML = `<i class="fas fa-user"></i> ${currentUser.firstName}`;
        topAuthLink.onclick = (e) => { e.preventDefault(); if (confirm('Logout?')) logout(); };
        loadCartCount(); loadWishlistCount();
        if (adminNavLink && currentUser.role === 'admin') adminNavLink.style.display = 'block';
        document.getElementById('profileUserName') && (document.getElementById('profileUserName').textContent = `${currentUser.firstName} ${currentUser.lastName}`);
    } else {
        topAuthLink.innerHTML = `<i class="fas fa-user"></i> Login / Register`;
        topAuthLink.onclick = (e) => { e.preventDefault(); showSection('authSection'); };
        if (adminNavLink) adminNavLink.style.display = 'none';
    }
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('logoLink')?.addEventListener('click', (e) => { e.preventDefault(); showSection('homeSection'); });
    document.getElementById('homeLink')?.addEventListener('click', (e) => { e.preventDefault(); showSection('homeSection'); });
    document.getElementById('productsLink')?.addEventListener('click', (e) => { e.preventDefault(); showSection('productsSection'); });
    
    document.getElementById('cartLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) { showToast('Please login first', 'error'); showSection('authSection'); return; }
        loadCart(); showSection('cartSection');
    });
    
    document.getElementById('wishlistLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) { showToast('Please login first', 'error'); showSection('authSection'); return; }
        loadWishlist(); showSection('wishlistSection');
    });
    
    document.getElementById('ordersLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) { showToast('Please login first', 'error'); showSection('authSection'); return; }
        loadOrders(); showSection('ordersSection');
    });
    
    document.getElementById('profileLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) { showToast('Please login first', 'error'); showSection('authSection'); return; }
        loadProfile(); showSection('profileSection');
    });
    
    document.getElementById('adminLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser || currentUser.role !== 'admin') { showToast('Access denied', 'error'); return; }
        loadAdminDashboard(); showSection('adminSection');
    });
    
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            document.getElementById('categoryFilter').value = item.dataset.category;
            filterProducts(); showSection('productsSection');
        });
    });
    
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}Form`).classList.add('active');
        });
    });
    
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    document.getElementById('profileForm')?.addEventListener('submit', handleUpdateProfile);
    document.getElementById('changePasswordForm')?.addEventListener('submit', handleChangePassword);
    
    document.getElementById('searchBtn')?.addEventListener('click', handleSearch);
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
    
    document.getElementById('categoryFilter')?.addEventListener('change', filterProducts);
    document.getElementById('sortFilter')?.addEventListener('change', sortProducts);
    document.getElementById('applyFiltersBtn')?.addEventListener('click', filterProducts);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);
    
    document.getElementById('checkoutBtn')?.addEventListener('click', proceedToCheckout);
    document.getElementById('applyDiscountBtn')?.addEventListener('click', applyDiscount);
    document.getElementById('clearCartBtn')?.addEventListener('click', clearCart);
    document.getElementById('saveCartBtn')?.addEventListener('click', saveCart);
    document.getElementById('placeOrderBtn')?.addEventListener('click', placeOrder);
    
    document.querySelectorAll('.order-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadOrders(tab.dataset.status);
        });
    });
    
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`admin${tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)}Tab`).classList.add('active');
        });
    });
    
    document.getElementById('addProductBtn')?.addEventListener('click', showAddProductForm);
    document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);
    document.getElementById('orderStatusForm')?.addEventListener('submit', handleOrderStatusUpdate);
    document.getElementById('adminOrderStatusFilter')?.addEventListener('change', (e) => loadAdminOrders(e.target.value));
    document.getElementById('addAddressBtn')?.addEventListener('click', showAddAddressForm);
    
    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => btn.closest('.modal').classList.remove('active')));
    document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', () => o.closest('.modal').classList.remove('active')));
    document.querySelector('.toast-close')?.addEventListener('click', () => document.getElementById('toast').classList.remove('show'));
}

// Helpers
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.querySelector('.toast-message').textContent = message;
    toast.className = `toast show ${type}`;
    toast.querySelector('.toast-icon i').className = type === 'success' ? 'fas fa-check-circle' : type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-exclamation-triangle';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showLoader() { document.getElementById('loader').classList.add('active'); }
function hideLoader() { document.getElementById('loader').classList.remove('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

async function apiRequest(url, options = {}) {
    try {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        const response = await fetch(url, { ...options, headers });
        const data = await response.json();
        if (!data.success && response.status === 401) { logout(); showToast('Session expired', 'error'); }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showToast('Network error', 'error');
        return { success: false, message: error.message };
    }
}

function getProductImage(product) {
    if (product.imageUrl && product.imageUrl.trim()) {
        return `<img src="${product.imageUrl}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><i class="fas fa-box" style="display:none;"></i>`;
    }
    return `<i class="fas fa-box"></i>`;
}

// AUTH
async function handleLogin(e) {
    e.preventDefault();
    showLoader();
    const result = await apiRequest(`${API.AUTH}/login`, {
        method: 'POST',
        body: JSON.stringify({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value })
    });
    hideLoader();
    if (result.success) {
        authToken = result.token; currentUser = result.data;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAuthUI(); showToast('Welcome back!');
        currentUser.role === 'admin' ? (loadAdminDashboard(), showSection('adminSection')) : showSection('homeSection');
        loadUserData();
    } else showToast(result.message, 'error');
}

async function handleRegister(e) {
    e.preventDefault();
    showLoader();
    const result = await apiRequest(`${API.AUTH}/register`, {
        method: 'POST',
        body: JSON.stringify({
            firstName: document.getElementById('registerFirstName').value,
            lastName: document.getElementById('registerLastName').value,
            email: document.getElementById('registerEmail').value,
            password: document.getElementById('registerPassword').value,
            phone: document.getElementById('registerPhone').value
        })
    });
    hideLoader();
    if (result.success) {
        showToast('Account created! Please login');
        document.querySelector('[data-tab="login"]').click();
    } else showToast(result.message, 'error');
}

function logout() {
    authToken = null; currentUser = null; cart = null; wishlist = null;
    localStorage.removeItem('authToken'); localStorage.removeItem('currentUser');
    updateAuthUI();
    document.getElementById('cartBadge').textContent = '0';
    document.getElementById('wishlistBadge').textContent = '0';
    showToast('Logged out'); showSection('homeSection');
}

async function loadUserData() { loadCartCount(); loadWishlistCount(); loadUserAddresses(); }
async function loadCartCount() { const r = await apiRequest(`${API.CART}/count`); if (r.success) document.getElementById('cartBadge').textContent = r.count; }
async function loadWishlistCount() { const r = await apiRequest(`${API.WISHLIST}`); if (r.success) document.getElementById('wishlistBadge').textContent = r.data.items?.length || 0; }
async function loadUserAddresses() { const r = await apiRequest(`${API.AUTH}/addresses`); if (r.success && currentUser) { currentUser.addresses = r.data; localStorage.setItem('currentUser', JSON.stringify(currentUser)); } }

// PRODUCTS
async function loadProducts() {
    showLoader();
    const result = await apiRequest(`${API.PRODUCTS}?limit=0`);
    hideLoader();
    if (result.success) {
        allProducts = result.data;
        allProducts.forEach(p => { if (p.category) categories.add(p.category); });
        
        const catFilter = document.getElementById('categoryFilter');
        if (catFilter) {
            while (catFilter.options.length > 1) catFilter.remove(1);
            categories.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; catFilter.appendChild(o); });
        }
        
        displayFlashSaleProducts(allProducts.slice(0, 6));
        displayDailyDeals(allProducts.slice(0, 6));
        displayProducts(allProducts.slice(0, 12), 'featuredProducts', true);
        displayProducts(allProducts.slice(0, 18), 'recommendedProducts', true);
        displayProducts(allProducts, 'productsList');
        document.getElementById('productsCount').textContent = allProducts.length;
    }
}

function displayFlashSaleProducts(products) {
    const c = document.getElementById('flashSaleProducts');
    if (!c) return;
    c.innerHTML = products.map(p => {
        const disc = Math.floor(Math.random() * 30) + 20;
        const orig = p.unitPrice * (1 + disc/100);
        const sold = Math.floor(Math.random() * 80) + 10;
        return `<div class="flash-product" onclick="showProductDetail('${p._id}')">
            <div class="product-image"><span class="product-badge sale">-${disc}%</span>${getProductImage(p)}</div>
            <div class="product-info">
                <div class="product-price">P${p.unitPrice?.toLocaleString('en-PH')}</div>
                <div class="product-original-price">P${orig.toLocaleString('en-PH', {maximumFractionDigits: 0})}</div>
                <div class="progress-bar"><div class="progress" style="width:${sold}%"></div></div>
                <div class="product-sold">${sold}% sold</div>
            </div>
        </div>`;
    }).join('');
}

function displayDailyDeals(products) {
    const c = document.getElementById('dailyDeals');
    if (!c) return;
    c.innerHTML = products.map(p => {
        const r = (Math.random() * 2 + 3).toFixed(1);
        const s = Math.floor(Math.random() * 500) + 50;
        return `<div class="product-card" style="flex:0 0 200px;" onclick="showProductDetail('${p._id}')">
            <div class="product-image">${getProductImage(p)}</div>
            <div class="product-info">
                <div class="product-name">${p.name}</div>
                <div class="product-price">P${p.unitPrice?.toLocaleString('en-PH')}</div>
                <div class="product-meta"><div class="product-rating"><i class="fas fa-star"></i><span>${r}</span></div><span class="product-sold">${s} sold</span></div>
            </div>
        </div>`;
    }).join('');
}

function displayProducts(products, containerId, isHome = false) {
    const c = document.getElementById(containerId);
    if (!c) return;
    if (!products.length) { c.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-box-open"></i><h3>No products found</h3></div>`; return; }
    
    c.innerHTML = products.map(p => {
        const r = (Math.random() * 2 + 3).toFixed(1);
        const s = Math.floor(Math.random() * 1000) + 100;
        return `<div class="product-card">
            <div class="product-image" onclick="showProductDetail('${p._id}')">
                ${p.quantity <= 5 && p.quantity > 0 ? '<span class="product-badge">Low Stock</span>' : ''}
                ${p.quantity <= 0 ? '<span class="product-badge sale">Sold Out</span>' : ''}
                ${getProductImage(p)}
            </div>
            <div class="product-info">
                <div class="product-name">${p.name}</div>
                <div class="product-price">P${p.unitPrice?.toLocaleString('en-PH')}</div>
                <div class="product-meta"><div class="product-rating"><i class="fas fa-star"></i><span>${r}</span></div><span class="product-sold">${s} sold</span></div>
                ${!isHome ? `<div class="product-actions">
                    ${p.quantity > 0 ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();addToCart('${p._id}','${p.name}',${p.unitPrice})"><i class="fas fa-cart-plus"></i> Add</button>` : '<button class="btn btn-secondary btn-sm" disabled>Sold Out</button>'}
                    <button class="btn btn-outline btn-icon btn-sm" onclick="event.stopPropagation();addToWishlist('${p._id}','${p.name}',${p.unitPrice})"><i class="fas fa-heart"></i></button>
                </div>` : ''}
            </div>
        </div>`;
    }).join('');
}

function showProductDetail(productId) {
    const p = allProducts.find(x => x._id === productId);
    if (!p) return;
    const modal = document.getElementById('productDetailModal');
    const r = (Math.random() * 2 + 3).toFixed(1);
    const rev = Math.floor(Math.random() * 500) + 50;
    const img = p.imageUrl && p.imageUrl.trim() ? `<img src="${p.imageUrl}" alt="${p.name}" style="max-width:100%;max-height:100%;object-fit:contain;">` : `<i class="fas fa-box"></i>`;
    
    document.getElementById('productDetail').innerHTML = `
        <div class="product-detail-grid">
            <div class="product-detail-image">${img}</div>
            <div class="product-detail-info">
                <h2>${p.name}</h2>
                <div class="product-meta" style="margin-bottom:12px;"><div class="product-rating"><i class="fas fa-star"></i><span>${r}</span></div><span style="color:var(--gray-400);">|</span><span>${rev} Reviews</span><span style="color:var(--gray-400);">|</span><span>${p.quantity > 0 ? p.quantity + ' in stock' : 'Out of Stock'}</span></div>
                <div class="product-detail-price">P${p.unitPrice?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                ${p.description ? `<p style="color:var(--gray-600);margin-bottom:16px;line-height:1.6;">${p.description}</p>` : ''}
                <div class="product-detail-meta"><p><strong>Category:</strong> ${p.category || 'Uncategorized'}</p></div>
                <div class="product-detail-actions">
                    ${p.quantity > 0 ? `<button class="btn btn-primary" onclick="addToCart('${p._id}','${p.name}',${p.unitPrice});closeModal('productDetailModal')"><i class="fas fa-cart-plus"></i> Add to Cart</button>` : '<button class="btn btn-secondary" disabled>Out of Stock</button>'}
                    <button class="btn btn-outline" onclick="addToWishlist('${p._id}','${p.name}',${p.unitPrice})"><i class="fas fa-heart"></i></button>
                </div>
            </div>
        </div>`;
    modal.classList.add('active');
}

function handleSearch() {
    const kw = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!kw) { displayProducts(allProducts, 'productsList'); document.getElementById('productsCount').textContent = allProducts.length; return; }
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(kw) || (p.description && p.description.toLowerCase().includes(kw)) || (p.category && p.category.toLowerCase().includes(kw)));
    displayProducts(filtered, 'productsList');
    document.getElementById('productsCount').textContent = filtered.length;
    showSection('productsSection');
}

function filterProducts() {
    let f = [...allProducts];
    const cat = document.getElementById('categoryFilter')?.value;
    const inStock = document.getElementById('filterInStock')?.checked;
    const active = document.getElementById('filterActive')?.checked;
    if (cat) f = f.filter(p => p.category === cat);
    if (inStock) f = f.filter(p => p.quantity > 0);
    if (active) f = f.filter(p => p.active);
    displayProducts(f, 'productsList');
    document.getElementById('productsCount').textContent = f.length;
}

function sortProducts() {
    const v = document.getElementById('sortFilter')?.value;
    let s = [...allProducts];
    const cat = document.getElementById('categoryFilter')?.value;
    if (cat) s = s.filter(p => p.category === cat);
    if (v === 'name-asc') s.sort((a, b) => a.name.localeCompare(b.name));
    else if (v === 'name-desc') s.sort((a, b) => b.name.localeCompare(a.name));
    else if (v === 'price-asc') s.sort((a, b) => a.unitPrice - b.unitPrice);
    else if (v === 'price-desc') s.sort((a, b) => b.unitPrice - a.unitPrice);
    displayProducts(s, 'productsList');
    document.getElementById('productsCount').textContent = s.length;
}

function clearFilters() {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('sortFilter').value = '';
    if (document.getElementById('filterInStock')) document.getElementById('filterInStock').checked = false;
    if (document.getElementById('filterActive')) document.getElementById('filterActive').checked = false;
    displayProducts(allProducts, 'productsList');
    document.getElementById('productsCount').textContent = allProducts.length;
}

// CART
async function addToCart(productId, name, unitPrice) {
    if (!currentUser) { showToast('Please login first', 'error'); showSection('authSection'); return; }
    const r = await apiRequest(`${API.CART}/add`, { method: 'POST', body: JSON.stringify({ productId, sku: productId, name, quantity: 1, unitPrice }) });
    if (r.success) { showToast('Added to cart'); loadCartCount(); } else showToast(r.message, 'error');
}

async function loadCart() {
    showLoader();
    const r = await apiRequest(`${API.CART}`);
    hideLoader();
    if (r.success) { cart = r.data; displayCart(); }
}

function displayCart() {
    const c = document.getElementById('cartItems');
    if (!cart || !cart.items.length) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><h3>Your cart is empty</h3><button class="btn btn-primary" onclick="showSection('productsSection')" style="margin-top:16px;">Shop Now</button></div>`;
        updateCartSummary(); return;
    }
    c.innerHTML = cart.items.map(item => {
        const p = allProducts.find(x => x._id === item.productId);
        const img = p && p.imageUrl ? `<img src="${p.imageUrl}" alt="${item.name}">` : `<i class="fas fa-box"></i>`;
        return `<div class="cart-item">
            <div class="cart-item-image">${img}</div>
            <div class="cart-item-info"><div class="cart-item-name">${item.name}</div><div class="cart-item-price">P${item.unitPrice?.toLocaleString('en-PH')} each</div></div>
            <div class="cart-item-controls">
                <div class="quantity-control"><button onclick="updateCartQuantity('${item.productId}',${item.quantity - 1})">-</button><span>${item.quantity}</span><button onclick="updateCartQuantity('${item.productId}',${item.quantity + 1})">+</button></div>
                <div class="cart-item-total">P${item.totalPrice?.toLocaleString('en-PH')}</div>
                <button class="btn btn-icon btn-sm" onclick="removeFromCart('${item.productId}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
    updateCartSummary();
}

function updateCartSummary() {
    document.getElementById('cartSubtotal').textContent = `P${(cart?.totalAmount || 0).toLocaleString('en-PH')}`;
    document.getElementById('cartDiscount').textContent = `-P${(cart?.discount || 0).toLocaleString('en-PH')}`;
    document.getElementById('cartTotal').textContent = `P${(cart?.finalAmount || cart?.totalAmount || 0).toLocaleString('en-PH')}`;
}

async function updateCartQuantity(productId, qty) {
    if (qty < 1) { removeFromCart(productId); return; }
    showLoader();
    const r = await apiRequest(`${API.CART}/update/${productId}`, { method: 'PUT', body: JSON.stringify({ quantity: qty }) });
    hideLoader();
    if (r.success) { cart = r.data; displayCart(); loadCartCount(); } else showToast(r.message, 'error');
}

async function removeFromCart(productId) {
    showLoader();
    const r = await apiRequest(`${API.CART}/remove/${productId}`, { method: 'DELETE' });
    hideLoader();
    if (r.success) { cart = r.data; displayCart(); loadCartCount(); showToast('Item removed'); } else showToast(r.message, 'error');
}

async function applyDiscount() {
    const code = document.getElementById('discountCode').value.trim().toUpperCase();
    if (!code) { showToast('Enter a code', 'error'); return; }
    showLoader();
    const r = await apiRequest(`${API.CART}/apply-discount`, { method: 'POST', body: JSON.stringify({ discountCode: code }) });
    hideLoader();
    if (r.success) { cart = r.data; displayCart(); showToast('Discount applied!'); } else showToast(r.message, 'error');
}

async function clearCart() {
    if (!confirm('Clear your cart?')) return;
    showLoader();
    const r = await apiRequest(`${API.CART}/clear`, { method: 'DELETE' });
    hideLoader();
    if (r.success) { cart = r.data; displayCart(); loadCartCount(); showToast('Cart cleared'); } else showToast(r.message, 'error');
}

async function saveCart() {
    const name = prompt('Name for saved cart:');
    if (!name) return;
    showLoader();
    const r = await apiRequest(`${API.CART}/save`, { method: 'POST', body: JSON.stringify({ name }) });
    hideLoader();
    if (r.success) showToast('Cart saved!'); else showToast(r.message, 'error');
}

// WISHLIST
async function addToWishlist(productId, name, unitPrice) {
    if (!currentUser) { showToast('Please login first', 'error'); showSection('authSection'); return; }
    const r = await apiRequest(`${API.WISHLIST}/add`, { method: 'POST', body: JSON.stringify({ productId, sku: productId, name, unitPrice }) });
    if (r.success) { showToast('Added to wishlist'); loadWishlistCount(); } else showToast(r.message, 'error');
}

async function loadWishlist() {
    showLoader();
    const r = await apiRequest(`${API.WISHLIST}`);
    hideLoader();
    if (r.success) { wishlist = r.data; displayWishlist(); }
}

function displayWishlist() {
    const c = document.getElementById('wishlistItems');
    if (!wishlist || !wishlist.items.length) {
        c.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-heart"></i><h3>Wishlist empty</h3><button class="btn btn-primary" onclick="showSection('productsSection')" style="margin-top:16px;">Browse</button></div>`;
        return;
    }
    c.innerHTML = wishlist.items.map(item => {
        const p = allProducts.find(x => x._id === item.productId);
        const img = p && p.imageUrl ? `<img src="${p.imageUrl}" alt="${item.name}">` : `<i class="fas fa-box"></i>`;
        return `<div class="wishlist-item">
            <div class="wishlist-item-image">${img}</div>
            <div class="wishlist-item-info"><div class="wishlist-item-name">${item.name}</div><div class="wishlist-item-price">P${item.unitPrice?.toLocaleString('en-PH')}</div></div>
            <div class="wishlist-item-actions">
                <button class="btn btn-primary btn-sm" onclick="moveToCart('${item.productId}')"><i class="fas fa-cart-plus"></i> Add</button>
                <button class="btn btn-outline btn-icon btn-sm" onclick="removeFromWishlist('${item.productId}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

async function moveToCart(productId) {
    showLoader();
    const r = await apiRequest(`${API.WISHLIST}/move-to-cart/${productId}`, { method: 'POST', body: JSON.stringify({ quantity: 1 }) });
    hideLoader();
    if (r.success) { wishlist = r.data.wishlist; cart = r.data.cart; displayWishlist(); loadCartCount(); loadWishlistCount(); showToast('Moved to cart'); } else showToast(r.message, 'error');
}

async function removeFromWishlist(productId) {
    showLoader();
    const r = await apiRequest(`${API.WISHLIST}/remove/${productId}`, { method: 'DELETE' });
    hideLoader();
    if (r.success) { wishlist = r.data; displayWishlist(); loadWishlistCount(); showToast('Removed'); } else showToast(r.message, 'error');
}

// CHECKOUT & ORDERS
async function proceedToCheckout() {
    if (!cart || !cart.items.length) { showToast('Cart is empty', 'error'); return; }
    if (currentUser?.addresses?.length) {
        const addr = currentUser.addresses.find(a => a.isDefault) || currentUser.addresses[0];
        if (addr) {
            document.getElementById('checkoutStreet').value = addr.street || '';
            document.getElementById('checkoutCity').value = addr.city || '';
            document.getElementById('checkoutState').value = addr.state || '';
            document.getElementById('checkoutZip').value = addr.zipCode || '';
            document.getElementById('checkoutCountry').value = addr.country || 'Philippines';
        }
    }
    displayCheckoutSummary();
    showSection('checkoutSection');
}

function displayCheckoutSummary() {
    document.getElementById('checkoutItems').innerHTML = cart.items.map(i => `<div class="checkout-item"><span>${i.name} x ${i.quantity}</span><span>P${i.totalPrice?.toLocaleString('en-PH')}</span></div>`).join('');
    const sub = cart.totalAmount || 0, tax = sub * 0.12, ship = 50, disc = cart.discount || 0;
    document.getElementById('checkoutSubtotal').textContent = `P${sub.toLocaleString('en-PH')}`;
    document.getElementById('checkoutTax').textContent = `P${tax.toLocaleString('en-PH')}`;
    document.getElementById('checkoutShipping').textContent = `P${ship.toLocaleString('en-PH')}`;
    document.getElementById('checkoutDiscount').textContent = `-P${disc.toLocaleString('en-PH')}`;
    document.getElementById('checkoutTotal').textContent = `P${(sub + tax + ship - disc).toLocaleString('en-PH')}`;
}

async function placeOrder() {
    const addr = { street: document.getElementById('checkoutStreet').value, city: document.getElementById('checkoutCity').value, state: document.getElementById('checkoutState').value, zipCode: document.getElementById('checkoutZip').value, country: document.getElementById('checkoutCountry').value };
    if (!addr.street || !addr.city || !addr.state || !addr.zipCode) { showToast('Fill all address fields', 'error'); return; }
    if (!cart || !cart.items || cart.items.length === 0) { showToast('Cart is empty', 'error'); return; }
    
    showLoader();
    const sub = cart.totalAmount || 0;
    const tax = sub * 0.12;
    const ship = 50;
    const disc = cart.discount || 0;
    const total = sub + tax + ship - disc;
    
    const r = await apiRequest(`${API.ORDERS}`, { 
        method: 'POST', 
        body: JSON.stringify({ 
            items: cart.items,
            shippingAddress: addr, 
            billingAddress: addr,
            subtotal: sub,
            tax: tax,
            shippingFee: ship,
            discount: disc,
            paymentMethod: document.querySelector('input[name="payment"]:checked').value 
        }) 
    });
    hideLoader();
    if (r.success) { showToast('Order placed!'); await loadCart(); loadCartCount(); loadOrders(); showSection('ordersSection'); } else showToast(r.message, 'error');
}

async function loadOrders(status = '') {
    showLoader();
    const r = await apiRequest(status ? `${API.ORDERS}/status/${status}` : `${API.ORDERS}`);
    hideLoader();
    if (r.success) displayOrders(r.data);
}

function displayOrders(orders) {
    const c = document.getElementById('ordersList');
    if (!orders?.length) { c.innerHTML = `<div class="empty-state"><i class="fas fa-box"></i><h3>No orders yet</h3></div>`; return; }
    c.innerHTML = orders.map(o => `<div class="order-card">
        <div class="order-card-header"><div class="order-info"><span class="order-number">#${o.orderNumber}</span><span class="order-date">${new Date(o.createdAt).toLocaleDateString()}</span></div><span class="order-status ${o.status}">${o.status}</span></div>
        <div class="order-card-body"><div class="order-items">${o.items.slice(0, 3).map(i => `<div class="order-item"><span>${i.name} x ${i.quantity}</span><span>P${i.totalPrice?.toLocaleString('en-PH')}</span></div>`).join('')}${o.items.length > 3 ? `<p style="font-size:13px;color:var(--gray-500);">+${o.items.length - 3} more</p>` : ''}</div></div>
        <div class="order-card-footer"><span class="order-total">Total: P${o.totalAmount?.toLocaleString('en-PH')}</span><button class="btn btn-outline btn-sm" onclick="showOrderDetail('${o._id}')">View Details</button></div>
    </div>`).join('');
}

async function showOrderDetail(orderId) {
    showLoader();
    const r = await apiRequest(`${API.ORDERS}/${orderId}`);
    hideLoader();
    if (r.success) {
        const o = r.data;
        document.getElementById('orderDetail').innerHTML = `<h2 style="margin-bottom:16px;">Order #${o.orderNumber}</h2><span class="order-status ${o.status}">${o.status}</span>
            <h4 style="margin:20px 0 10px;">Items</h4>${o.items.map(i => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--gray-200);"><span>${i.name} x ${i.quantity}</span><span>P${i.totalPrice?.toLocaleString('en-PH')}</span></div>`).join('')}
            <h4 style="margin:20px 0 10px;">Shipping</h4><p style="color:var(--gray-600);">${o.shippingAddress?.street}<br>${o.shippingAddress?.city}, ${o.shippingAddress?.state} ${o.shippingAddress?.zipCode}</p>
            <h4 style="margin:20px 0 10px;">Payment</h4><p style="color:var(--gray-600);">${o.paymentMethod?.replace(/_/g, ' ').toUpperCase()}</p>
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--gray-200);"><div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;"><span>Total</span><span style="color:var(--secondary);">P${o.totalAmount?.toLocaleString('en-PH')}</span></div></div>
            ${o.trackingNumber ? `<div style="margin-top:16px;padding:12px;background:var(--gray-100);border-radius:var(--radius);"><strong>Tracking:</strong> ${o.trackingNumber}</div>` : ''}`;
        document.getElementById('orderDetailModal').classList.add('active');
    }
}

// PROFILE
function loadProfile() {
    if (!currentUser) return;
    document.getElementById('profileFirstName').value = currentUser.firstName || '';
    document.getElementById('profileLastName').value = currentUser.lastName || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profilePhone').value = currentUser.phone || '';
    document.getElementById('profileUserName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    displayAddresses();
}

function displayAddresses() {
    const c = document.getElementById('addressList');
    if (!currentUser.addresses?.length) { c.innerHTML = '<p style="color:var(--gray-500);">No saved addresses</p>'; return; }
    c.innerHTML = currentUser.addresses.map((a, i) => `<div style="padding:16px;background:var(--gray-50);border-radius:var(--radius);margin-bottom:12px;${a.isDefault ? 'border:2px solid var(--primary);' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:start;"><div><p><strong>${a.label || 'Address ' + (i + 1)}</strong> ${a.isDefault ? '<span style="color:var(--primary);font-size:12px;">(Default)</span>' : ''}</p><p style="color:var(--gray-600);font-size:13px;margin-top:4px;">${a.street}, ${a.city}, ${a.state} ${a.zipCode}</p></div><button class="btn btn-icon btn-sm" onclick="deleteAddress('${a._id}')"><i class="fas fa-trash"></i></button></div>
    </div>`).join('');
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    showLoader();
    const data = { firstName: document.getElementById('profileFirstName').value, lastName: document.getElementById('profileLastName').value, email: document.getElementById('profileEmail').value, phone: document.getElementById('profilePhone').value };
    const r = await apiRequest(`${API.AUTH}/profile`, { method: 'PUT', body: JSON.stringify(data) });
    hideLoader();
    if (r.success) { currentUser = { ...currentUser, ...data }; localStorage.setItem('currentUser', JSON.stringify(currentUser)); showToast('Profile updated'); } else showToast(r.message, 'error');
}

async function handleChangePassword(e) {
    e.preventDefault();
    const cur = document.getElementById('currentPassword').value, newP = document.getElementById('newPassword').value, conf = document.getElementById('confirmPassword').value;
    if (newP !== conf) { showToast('Passwords do not match', 'error'); return; }
    showLoader();
    const r = await apiRequest(`${API.AUTH}/change-password`, { method: 'PUT', body: JSON.stringify({ currentPassword: cur, newPassword: newP }) });
    hideLoader();
    if (r.success) { showToast('Password changed'); document.getElementById('changePasswordForm').reset(); } else showToast(r.message, 'error');
}

function showAddAddressForm() {
    if (document.getElementById('addressFormModal')) { document.getElementById('addressFormModal').classList.add('active'); return; }
    document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="addressFormModal"><div class="modal-overlay"></div><div class="modal-content"><button class="modal-close"><i class="fas fa-times"></i></button><h3 class="modal-title">Add Address</h3><form id="addressForm"><div class="form-group"><label>Label</label><input type="text" id="addressLabel" placeholder="e.g., Home" required></div><div class="form-group"><label>Street</label><input type="text" id="addressStreet" required></div><div class="form-row"><div class="form-group"><label>City</label><input type="text" id="addressCity" required></div><div class="form-group"><label>Province</label><input type="text" id="addressState" required></div></div><div class="form-row"><div class="form-group"><label>Postal Code</label><input type="text" id="addressZip" required></div><div class="form-group"><label>Country</label><input type="text" id="addressCountry" value="Philippines" required></div></div><div class="form-group" style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="addressDefault"><label for="addressDefault" style="margin:0;">Set as default</label></div><button type="submit" class="btn btn-primary btn-block">Save</button></form></div></div>`);
    document.getElementById('addressFormModal').querySelector('.modal-close').addEventListener('click', () => document.getElementById('addressFormModal').classList.remove('active'));
    document.getElementById('addressFormModal').querySelector('.modal-overlay').addEventListener('click', () => document.getElementById('addressFormModal').classList.remove('active'));
    document.getElementById('addressForm').addEventListener('submit', handleAddAddress);
    document.getElementById('addressFormModal').classList.add('active');
}

async function handleAddAddress(e) {
    e.preventDefault();
    showLoader();
    const r = await apiRequest(`${API.AUTH}/addresses`, { method: 'POST', body: JSON.stringify({ label: document.getElementById('addressLabel').value, street: document.getElementById('addressStreet').value, city: document.getElementById('addressCity').value, state: document.getElementById('addressState').value, zipCode: document.getElementById('addressZip').value, country: document.getElementById('addressCountry').value, isDefault: document.getElementById('addressDefault').checked }) });
    hideLoader();
    if (r.success) { currentUser.addresses = r.data; localStorage.setItem('currentUser', JSON.stringify(currentUser)); displayAddresses(); document.getElementById('addressFormModal').classList.remove('active'); showToast('Address added'); } else showToast(r.message, 'error');
}

async function deleteAddress(addressId) {
    if (!confirm('Delete this address?')) return;
    showLoader();
    const r = await apiRequest(`${API.AUTH}/addresses/${addressId}`, { method: 'DELETE' });
    hideLoader();
    if (r.success) { currentUser.addresses = r.data; localStorage.setItem('currentUser', JSON.stringify(currentUser)); displayAddresses(); showToast('Address deleted'); } else showToast(r.message, 'error');
}

// ADMIN
async function loadAdminDashboard() {
    showLoader();
    const [ordersRes, productsRes, usersRes] = await Promise.all([apiRequest(`${API.ORDERS}/all`), apiRequest(`${API.PRODUCTS}?limit=0`), apiRequest(`${API.AUTH}/users`)]);
    hideLoader();
    if (ordersRes.success) {
        document.getElementById('totalOrders').textContent = ordersRes.data.length;
        document.getElementById('totalRevenue').textContent = `P${ordersRes.data.reduce((s, o) => s + (o.totalAmount || 0), 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
        displayAdminOrders(ordersRes.data);
    }
    if (productsRes.success) { document.getElementById('totalProducts').textContent = productsRes.data.length; displayAdminProducts(productsRes.data); }
    if (usersRes.success) { document.getElementById('totalUsers').textContent = usersRes.data.length; displayAdminUsers(usersRes.data); }
}

async function loadAdminOrders(status = '') {
    const r = await apiRequest(status ? `${API.ORDERS}/all?status=${status}` : `${API.ORDERS}/all`);
    if (r.success) displayAdminOrders(r.data);
}

function displayAdminOrders(orders) {
    const c = document.getElementById('adminOrdersList');
    if (!orders?.length) { c.innerHTML = '<p style="text-align:center;padding:40px;color:var(--gray-500);">No orders</p>'; return; }
    c.innerHTML = `<table class="admin-table"><thead><tr><th>Order #</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>${orders.map(o => `<tr><td>${o.orderNumber}</td><td>${new Date(o.createdAt).toLocaleDateString()}</td><td>${o.items?.length || 0}</td><td>P${o.totalAmount?.toLocaleString('en-PH')}</td><td><span class="order-status ${o.status}">${o.status}</span></td><td class="actions"><button class="btn btn-sm btn-secondary" onclick="updateOrderStatus('${o._id}','${o.orderNumber}','${o.status}')"><i class="fas fa-edit"></i></button></td></tr>`).join('')}</tbody></table>`;
}

function showAddProductForm() {
    currentEditingProduct = null;
    document.getElementById('productFormTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('productFormModal').classList.add('active');
}

function editProduct(productId) {
    const p = allProducts.find(x => x._id === productId);
    if (!p) return;
    currentEditingProduct = p;
    document.getElementById('productFormTitle').textContent = 'Edit Product';
    document.getElementById('productName').value = p.name;
    document.getElementById('productDescription').value = p.description || '';
    document.getElementById('productCategory').value = p.category || '';
    document.getElementById('productQuantity').value = p.quantity;
    document.getElementById('productUnitPrice').value = p.unitPrice;
    document.getElementById('productImageUrl').value = p.imageUrl || '';
    document.getElementById('productFormModal').classList.add('active');
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const data = { name: document.getElementById('productName').value, description: document.getElementById('productDescription').value, category: document.getElementById('productCategory').value, quantity: parseInt(document.getElementById('productQuantity').value), unitPrice: parseFloat(document.getElementById('productUnitPrice').value), imageUrl: document.getElementById('productImageUrl').value, active: true };
    showLoader();
    const r = currentEditingProduct ? await apiRequest(`${API.PRODUCTS}/${currentEditingProduct._id}`, { method: 'PUT', body: JSON.stringify(data) }) : await apiRequest(`${API.PRODUCTS}`, { method: 'POST', body: JSON.stringify(data) });
    hideLoader();
    if (r.success) { showToast(`Product ${currentEditingProduct ? 'updated' : 'added'}`); document.getElementById('productFormModal').classList.remove('active'); loadProducts(); loadAdminDashboard(); } else showToast(r.message, 'error');
}

async function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;
    showLoader();
    const r = await apiRequest(`${API.PRODUCTS}/${productId}`, { method: 'DELETE' });
    hideLoader();
    if (r.success) { showToast('Deleted'); loadProducts(); loadAdminDashboard(); } else showToast(r.message, 'error');
}

function displayAdminProducts(products) {
    const c = document.getElementById('adminProductsList');
    if (!products?.length) { c.innerHTML = '<p style="text-align:center;padding:40px;color:var(--gray-500);">No products</p>'; return; }
    c.innerHTML = `<table class="admin-table"><thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>${products.map(p => `<tr><td><div style="width:50px;height:50px;background:var(--gray-100);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;overflow:hidden;">${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" style="max-width:100%;max-height:100%;object-fit:contain;">` : '<i class="fas fa-box" style="color:var(--gray-400);"></i>'}</div></td><td>${p.name}</td><td>${p.category || 'N/A'}</td><td>P${p.unitPrice?.toLocaleString('en-PH')}</td><td>${p.quantity}</td><td class="actions"><button class="btn btn-sm btn-secondary" onclick="editProduct('${p._id}')"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="deleteProduct('${p._id}')"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table>`;
}

function updateOrderStatus(orderId, orderNumber, currentStatus) {
    currentEditingOrder = orderId;
    document.getElementById('orderStatusNumber').value = orderNumber;
    document.getElementById('orderStatusSelect').value = currentStatus;
    document.getElementById('orderTrackingNumber').value = '';
    document.getElementById('orderStatusNote').value = '';
    document.getElementById('orderStatusModal').classList.add('active');
}

async function handleOrderStatusUpdate(e) {
    e.preventDefault();
    showLoader();
    const r = await apiRequest(`${API.ORDERS}/${currentEditingOrder}/status`, { method: 'PUT', body: JSON.stringify({ status: document.getElementById('orderStatusSelect').value, trackingNumber: document.getElementById('orderTrackingNumber').value, note: document.getElementById('orderStatusNote').value }) });
    hideLoader();
    if (r.success) { showToast('Updated'); document.getElementById('orderStatusModal').classList.remove('active'); loadAdminOrders(); } else showToast(r.message, 'error');
}

function displayAdminUsers(users) {
    const c = document.getElementById('adminUsersList');
    if (!users?.length) { c.innerHTML = '<p style="text-align:center;padding:40px;color:var(--gray-500);">No users</p>'; return; }
    c.innerHTML = `<table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead><tbody>${users.map(u => `<tr><td>${u.firstName} ${u.lastName}</td><td>${u.email}</td><td>${u.phone || 'N/A'}</td><td><span style="color:${u.role === 'admin' ? 'var(--warning)' : 'var(--gray-600)'};font-weight:600;">${u.role.toUpperCase()}</span></td><td>${new Date(u.createdAt).toLocaleDateString()}</td><td class="actions"><button class="btn btn-sm btn-secondary" onclick="toggleUserRole('${u._id}','${u.role}')"><i class="fas fa-user-shield"></i></button><button class="btn btn-sm btn-danger" onclick="deleteUser('${u._id}')"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table>`;
}

async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'customer' : 'admin';
    if (!confirm(`Change to ${newRole}?`)) return;
    const r = await apiRequest(`${API.AUTH}/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
    if (r.success) { showToast('Role updated'); loadAdminDashboard(); } else showToast(r.message, 'error');
}

async function deleteUser(userId) {
    if (!confirm('Delete this user?')) return;
    showLoader();
    const r = await apiRequest(`${API.AUTH}/users/${userId}`, { method: 'DELETE' });
    hideLoader();
    if (r.success) { showToast('User deleted'); loadAdminDashboard(); } else showToast(r.message, 'error');

}


// BarterHub Main Script

// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
  updateNav();
  
  const path = window.location.pathname;
  
  if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
    loadItems();
  } else if (path.includes('dashboard.html')) {
    checkAuth();
    loadTrades();
  } else if (path.includes('profile.html')) {
    checkAuth();
    loadProfile();
  } else if (path.includes('upload.html')) {
    checkAuth();
  }
});

// Update navigation based on auth status
function updateNav() {
  const token = localStorage.getItem('token');
  const loginLink = document.getElementById('loginLink');
  const logoutLink = document.getElementById('logoutLink');
  const profileLink = document.getElementById('profileLink');
  const uploadLink = document.getElementById('uploadLink');
  
  if (token) {
    if (loginLink) loginLink.style.display = 'none';
    if (logoutLink) logoutLink.style.display = 'block';
    if (profileLink) profileLink.style.display = 'block';
    if (uploadLink) uploadLink.style.display = 'block';
  } else {
    if (loginLink) loginLink.style.display = 'block';
    if (logoutLink) logoutLink.style.display = 'none';
    if (profileLink) profileLink.style.display = 'none';
    if (uploadLink) uploadLink.style.display = 'none';
  }
}

// Check if user is logged in
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Logout
function logout() {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}

// ===========================
// AUTHENTICATION
// ===========================

async function handleRegister(event) {
  event.preventDefault();
  const errorEl = document.getElementById('registerError');
  
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  
  try {
    await api.register(name, email, password);
    alert('Registration successful! Please login.');
    showForm('login');
    event.target.reset();
  } catch (error) {
    if (errorEl) errorEl.textContent = error.message;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const errorEl = document.getElementById('loginError');
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const data = await api.login(email, password);
    // Store user ID for delete functionality
    localStorage.setItem('userId', data.user._id);
    alert(`Welcome back, ${data.user.name}!`);
    window.location.href = 'index.html';
  } catch (error) {
    if (errorEl) errorEl.textContent = error.message;
  }
}

// ===========================
// ITEMS
// ===========================

async function loadItems() {
  try {
    const items = await api.getItems();
    displayItems(items);
  } catch (error) {
    console.error('Error loading items:', error);
    showNoItems();
  }
}

function displayItems(items) {
  const grid = document.getElementById('itemsGrid');
  const noItems = document.getElementById('noItems');
  
  if (!items || items.length === 0) {
    showNoItems();
    return;
  }
  
  if (grid) {
    grid.innerHTML = items.map(item => createItemCard(item)).join('');
  }
  
  if (noItems) noItems.style.display = 'none';
}

function showNoItems() {
  const grid = document.getElementById('itemsGrid');
  const noItems = document.getElementById('noItems');
  
  if (grid) grid.innerHTML = '';
  if (noItems) noItems.style.display = 'block';
}

function createItemCard(item) {
  const imageUrl = item.image || '';
  // Handle populated ownerId from server.js - it populates ownerId with {name, email}
  const ownerName = item.ownerId?.name || item.owner?.name || 'Unknown';
  
  // Check if current user owns this item (for delete button)
  const currentUserId = localStorage.getItem('userId');
  const isOwner = currentUserId && (item.ownerId?._id === currentUserId || item.owner?._id === currentUserId);
  
  return `
    <div class="item-card">
      <div class="item-image">
        <img src="${imageUrl}" alt="${item.title}" onerror="this.style.display='none'">
        <span class="item-category">${item.category}</span>
      </div>
      <div class="item-details">
        <h3>${item.title}</h3>
        <p>${(item.description || '').substring(0, 80)}...</p>
        <div class="item-meta">
          <span><i class="fas fa-user"></i> ${ownerName}</span>
          <span><i class="fas fa-exchange-alt"></i> ${item.lookingFor || 'Open to offers'}</span>
        </div>
        <div class="item-actions">
          <button class="btn btn-primary" onclick="offerTrade('${item._id}')">
            <i class="fas fa-handshake"></i> Offer Trade
          </button>
          ${isOwner ? `<button class="btn btn-danger" onclick="deleteItem('${item._id}')">
            <i class="fas fa-trash"></i> Delete
          </button>` : ''}
        </div>
      </div>
    </div>
  `;
}

async function offerTrade(itemId) {
  if (!checkAuth()) return;
  
  try {
    // Validate item exists first
    const item = await api.getItem(itemId);
    const offeredItem = prompt(`Offer trade for "${item.title}"?\nWhat item are you offering?`);
    if (!offeredItem) return;
    
    await api.createTrade(itemId, offeredItem);
    alert('Trade offer sent successfully!');
  } catch (error) {
    if (error.message.includes('not found')) {
      alert('Product not found. It may have been deleted.');
    } else {
      alert(error.message);
    }
  }
}

async function deleteItem(itemId) {
  if (!confirm('Are you sure you want to delete this item?')) return;
  
  try {
    await api.deleteItem(itemId);
    alert('Item deleted successfully!');
    loadItems(); // Refresh the list
  } catch (error) {
    alert(error.message);
  }
}

function filterItems() {
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const category = document.getElementById('categoryFilter')?.value || '';
  
  const cards = document.querySelectorAll('.item-card');
  
  cards.forEach(card => {
    const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
    const desc = card.querySelector('p')?.textContent.toLowerCase() || '';
    const cat = card.querySelector('.item-category')?.textContent || '';
    
    const matchesSearch = title.includes(search) || desc.includes(search);
    const matchesCategory = !category || cat === category;
    
    card.style.display = matchesSearch && matchesCategory ? 'block' : 'none';
  });
}

// ===========================
// UPLOAD
// Note: handleUpload is now in upload.html with image upload support
// ===========================

// ===========================
// PROFILE
// ===========================

async function loadProfile() {
  try {
    const data = await api.getProfile();
    
    document.getElementById('profileName').textContent = data.user.name;
    document.getElementById('profileEmail').textContent = data.user.email;
    document.getElementById('profileJoined').textContent = `Member since ${new Date(data.user.createdAt).toLocaleDateString()}`;
    
    const itemsGrid = document.getElementById('myItemsGrid');
    const noItems = document.getElementById('noMyItems');
    
    if (data.items && data.items.length > 0) {
      if (itemsGrid) itemsGrid.innerHTML = data.items.map(item => createItemCard(item)).join('');
      if (noItems) noItems.style.display = 'none';
    } else {
      if (itemsGrid) itemsGrid.innerHTML = '';
      if (noItems) noItems.style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

function showEditProfile() {
  document.getElementById('editProfile').style.display = 'block';
}

function hideEditProfile() {
  document.getElementById('editProfile').style.display = 'none';
}

async function updateProfile(event) {
  event.preventDefault();
  
  const data = {
    name: document.getElementById('editName').value,
    bio: document.getElementById('editBio').value
  };
  
  try {
    await api.updateProfile(data);
    alert('Profile updated!');
    hideEditProfile();
    loadProfile();
  } catch (error) {
    alert(error.message);
  }
}

// ===========================
// DASHBOARD / TRADES
// ===========================

async function loadTrades() {
  try {
    const trades = await api.getTrades();
    displayTrades(trades);
  } catch (error) {
    console.error('Error loading trades:', error);
  }
}

function displayTrades(trades) {
  const currentUserId = getCurrentUserId();
  const receivedList = document.getElementById('receivedList');
  const sentList = document.getElementById('sentList');
  const noTrades = document.getElementById('noTrades');
  
  if (!trades || trades.length === 0) {
    if (noTrades) noTrades.style.display = 'block';
    return;
  }
  
  if (noTrades) noTrades.style.display = 'none';
  
  const received = trades.filter(t => t.owner._id === currentUserId);
  const sent = trades.filter(t => t.requester._id === currentUserId);
  
  if (receivedList) {
    receivedList.innerHTML = received.length ? received.map(t => createTradeCard(t, 'received')).join('') : '<p>No trade requests received</p>';
  }
  
  if (sentList) {
    sentList.innerHTML = sent.length ? sent.map(t => createTradeCard(t, 'sent')).join('') : '<p>No trade offers sent</p>';
  }
}

function getCurrentUserId() {
  // This would come from the token in a real app
  return null;
}

function createTradeCard(trade, type) {
  const item = trade.item || {};
  const otherUser = type === 'received' ? trade.requester : trade.owner;
  const statusClass = `status-${trade.status}`;
  
  return `
    <div class="trade-card">
      <div class="trade-header">
        <span class="trade-status ${statusClass}">${trade.status}</span>
        <span class="trade-date">${new Date(trade.createdAt).toLocaleDateString()}</span>
      </div>
      <div class="trade-body">
        <div class="trade-item">
          <strong>Item:</strong> ${item.title || 'Unknown'}
        </div>
        <div class="trade-offer">
          <strong>Offered:</strong> ${trade.offeredItem}
        </div>
        <div class="trade-user">
          <strong>${type === 'received' ? 'From:' : 'To:'}</strong> ${otherUser?.name || 'Unknown'}
        </div>
      </div>
      ${type === 'received' && trade.status === 'pending' ? `
        <div class="trade-actions">
          <button class="btn btn-success" onclick="acceptTrade('${trade._id}')">Accept</button>
          <button class="btn btn-danger" onclick="declineTrade('${trade._id}')">Decline</button>
        </div>
      ` : ''}
    </div>
  `;
}

async function acceptTrade(tradeId) {
  try {
    await api.acceptTrade(tradeId);
    alert('Trade accepted!');
    loadTrades();
  } catch (error) {
    alert(error.message);
  }
}

async function declineTrade(tradeId) {
  try {
    await api.declineTrade(tradeId);
    loadTrades();
  } catch (error) {
    alert(error.message);
  }
}


// BarterHub API Service
// For production, use your deployed backend URL
// Local development: http://localhost:3000/api

// Detect environment - use production API if deployed, otherwise local
const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
const API_URL = isProduction ? 'https://barterhub-g3vp.onrender.com/api' : 'http://localhost:3000/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getToken() {
    return this.token || localStorage.getItem('token');
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  getHeaders(includeAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (includeAuth && this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }
    return headers;
  }

  // Get headers for multipart form data (no content-type set manually)
  getFormHeaders() {
    const headers = {};
    if (this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { ...this.getHeaders(), ...options.headers }
      });
      const data = await response.json();
      if (!response.ok) {
        // Show more detailed error if available
        const errorMsg = data.details ? JSON.stringify(data.details) : (data.message || 'Request failed');
        throw new Error(errorMsg);
      }
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Upload file with FormData
  async uploadFile(endpoint, formData) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getFormHeaders(),
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }
      return data;
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  }

  // Auth
  async register(name, email, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Items
  async getItems(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await this.request(`/items?${params}`);
    // Handle server.js response format: { success: true, data: { items: [...] } }
    if (response.data && response.data.items) {
      return response.data.items;
    }
    return response.items || response;
  }

  async getItem(id) {
    const response = await this.request(`/items/${id}`);
    // Handle server.js response format
    if (response.data && response.data.item) {
      return response.data.item;
    }
    return response.item || response;
  }

  // Create item - send as JSON matching server.js format exactly
  async createItem(itemData, imageFile = null) {
    if (imageFile) {
      // Use FormData for file upload
      const formData = new FormData();
      formData.append('title', itemData.title);
      formData.append('description', itemData.description);
      formData.append('category', itemData.category);
      formData.append('condition', itemData.condition || 'good');
      formData.append('lookingFor', itemData.lookingFor);
      formData.append('image', imageFile);
      
      console.log('Uploading item with image file');
      const response = await this.uploadFile('/items', formData);
      console.log('Upload response:', response);
      return response;
    } else {
      // JSON for URL/text only
      const itemPayload = {
        title: itemData.title,
        category: itemData.category,
        description: itemData.description,
        lookingFor: itemData.lookingFor || itemData.condition || ''
      };
      
      console.log('Sending item payload (no image):', JSON.stringify(itemPayload));
      const response = await this.request('/items', {
        method: 'POST',
        body: JSON.stringify(itemPayload)
      });
      console.log('Create item response:', response);
      return response;
    }
  }

  async updateItem(id, itemData) {
    return this.request(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData)
    });
  }

  async deleteItem(id) {
    return this.request(`/items/${id}`, { method: 'DELETE' });
  }

  async getMyItems() {
    // server.js doesn't have /items/user/my-items, get items by ownerId
    try {
      const response = await this.request('/items');
      const items = response.items || response.data?.items || response;
      // Filter items by current user (we'll handle this in the UI)
      return items;
    } catch (error) {
      console.error('Error fetching my items:', error);
      return [];
    }
  }

  // Trades
  async createTrade(itemId, offeredItem, location) {
    // server.js expects different format
    const response = await this.request('/trades', {
      method: 'POST',
      body: JSON.stringify({ 
        itemId, 
        offeredItem,
        location
      })
    });
    return response.trade || response.data?.trade || response;
  }

  async getTrades() {
    const response = await this.request('/trades');
    // Handle both response formats
    return response.trades || response.data?.trades || response;
  }

  async acceptTrade(id) {
    return this.request(`/trades/${id}/accept`, { method: 'PUT' });
  }

  async declineTrade(id) {
    return this.request(`/trades/${id}/decline`, { method: 'PUT' });
  }

  // User Profile - Handle server.js response format
  async getProfile() {
    const response = await this.request('/users/profile');
    // Handle wrapped response format from server.js
    return response.data || response;
  }

  async updateProfile(data) {
    const response = await this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.data || response;
  }

  // Health
  async healthCheck() {
    return this.request('/health');
  }
}

const api = new ApiService();

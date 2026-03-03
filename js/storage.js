// Local Storage Manager
// Handles fallback storage when Supabase is not configured

const StorageManager = {
    prefix: 'tko_foodmap_',
    
    // Check if Supabase is configured
    isSupabaseConfigured() {
        return SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' && 
               SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY';
    },
    
    // Local storage helpers
    get(key) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },
    
    getAll(key) {
        return this.get(key + 's') || [];
    },
    
    addToList(key, item) {
        const list = this.getAll(key);
        list.push(item);
        this.set(key + 's', list);
        return item;
    },
    
    updateInList(key, itemId, updates) {
        const list = this.getAll(key);
        const index = list.findIndex(item => item.id === itemId);
        if (index !== -1) {
            list[index] = { ...list[index], ...updates };
            this.set(key + 's', list);
            return list[index];
        }
        return null;
    },
    
    removeFromList(key, itemId) {
        const list = this.getAll(key);
        const filtered = list.filter(item => item.id !== itemId);
        this.set(key + 's', filtered);
        return true;
    },
    
    findById(key, itemId) {
        const list = this.getAll(key);
        return list.find(item => item.id === itemId) || null;
    },
    
    // Export all data
    exportData() {
        return {
            reviewers: this.getAll('reviewer'),
            restaurants: this.getAll('restaurant'),
            reviews: this.getAll('review'),
            currentReviewerId: this.get('currentReviewerId'),
            exportedAt: new Date().toISOString()
        };
    },
    
    // Import data
    importData(data) {
        if (data.reviewers) this.set('reviewers', data.reviewers);
        if (data.restaurants) this.set('restaurants', data.restaurants);
        if (data.reviews) this.set('reviews', data.reviews);
        if (data.currentReviewerId) this.set('currentReviewerId', data.currentReviewerId);
    },
    
    // Generate unique ID (UUID v4 format for Supabase compatibility)
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};

// Default restaurants near Tseung Kwan O station
// Note: These use simple IDs for local development only
// When using Supabase, new UUIDs will be generated
const DEFAULT_RESTAURANTS = [
    {
        id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        name: '聚喜軒海鮮酒家',
        cuisine: '中式',
        address: '將軍澳唐德街9號將軍澳中心1樓',
        lat: 22.3078,
        lng: 114.2594,
        reviews: []
    },
    {
        id: 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
        name: '南小館',
        cuisine: '中式',
        address: '將軍澳重華路8號東港城1樓',
        lat: 22.3065,
        lng: 114.2605,
        reviews: []
    },
    {
        id: 'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f',
        name: '元氣壽司',
        cuisine: '日式',
        address: '將軍澳唐德街3號將軍澳廣場B1樓',
        lat: 22.3070,
        lng: 114.2585,
        reviews: []
    },
    {
        id: 'd4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a',
        name: 'Outback Steakhouse',
        cuisine: '西式',
        address: '將軍澳重華路8號東港城2樓',
        lat: 22.3068,
        lng: 114.2608,
        reviews: []
    },
    {
        id: 'e5f6a7b8-c9d0-4e5f-2a3b-4c5d6e7f8a9b',
        name: '星巴克',
        cuisine: '咖啡廳',
        address: '將軍澳寶邑路62號將軍澳站',
        lat: 22.3077,
        lng: 114.2615,
        reviews: []
    },
    {
        id: 'f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c',
        name: '大家樂',
        cuisine: '快餐',
        address: '將軍澳寶邑路將軍澳廣場',
        lat: 22.3072,
        lng: 114.2580,
        reviews: []
    }
];

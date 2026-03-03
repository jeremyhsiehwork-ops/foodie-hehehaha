// Main App
// Initializes and coordinates all modules

const App = {
    restaurants: [],
    reviews: [],
    currentDetailRestaurant: null,
    
    // Initialize app
    async init() {
        console.log('TKO Food Map initializing...');
        
        // Initialize Supabase
        SupabaseClient.init();
        
        // Setup modal handlers
        UI.setupModalHandlers();
        
        // Initialize reviewers
        await ReviewersManager.init();
        
        // Initialize map
        MapManager.init();
        
        // Load data
        await this.refreshData();
        
        // Setup event handlers
        this.setupEventHandlers();
        
        console.log('TKO Food Map initialized!');
    },
    
    // Refresh all data
    async refreshData() {
        // Load restaurants
        this.restaurants = await SupabaseClient.getRestaurants();
        
        // Load reviews for each restaurant
        for (const restaurant of this.restaurants) {
            restaurant.reviews = await SupabaseClient.getReviews(restaurant.id);
        }
        
        // Update UI
        this.renderRestaurantList();
        MapManager.updateMarkers(this.restaurants);
    },
    
    // Render restaurant list
    renderRestaurantList() {
        const cuisineFilter = document.getElementById('cuisine-filter')?.value;
        const ratingFilter = document.getElementById('rating-filter')?.value;
        const searchQuery = document.getElementById('search-input')?.value;
        
        const filters = {
            cuisine: cuisineFilter || null,
            minRating: ratingFilter ? parseFloat(ratingFilter) : null,
            search: searchQuery || null
        };
        
        UI.renderRestaurantList(this.restaurants, filters);
    },
    
    // Show restaurant detail modal
    async showRestaurantDetail(restaurantId) {
        const restaurant = this.restaurants.find(r => r.id === restaurantId);
        if (!restaurant) return;
        
        this.currentDetailRestaurant = restaurant;
        const reviews = await SupabaseClient.getReviews(restaurantId);
        
        UI.renderRestaurantDetail(restaurant, reviews, ReviewersManager.reviewers);
        UI.showModal('restaurant-detail-modal');
        
        // Focus map on restaurant
        if (restaurant.lat && restaurant.lng) {
            MapManager.focusOnRestaurant(restaurant.lat, restaurant.lng);
        }
    },
    
    // Setup event handlers
    setupEventHandlers() {
        // Setup page: Create reviewer
        document.getElementById('create-reviewer-btn')?.addEventListener('click', async () => {
            const input = document.getElementById('new-reviewer-name');
            const name = input.value.trim();
            
            if (name) {
                const reviewer = await ReviewersManager.createReviewer(name);
                if (reviewer) {
                    input.value = '';
                    UI.showToast('用戶已創建，請選擇', 'success');
                }
            } else {
                UI.showToast('請輸入名字', 'error');
            }
        });
        
        // Search input
        document.getElementById('search-input')?.addEventListener('input', () => {
            this.renderRestaurantList();
        });
        
        // Cuisine filter
        document.getElementById('cuisine-filter')?.addEventListener('change', () => {
            this.renderRestaurantList();
        });
        
        // Rating filter
        document.getElementById('rating-filter')?.addEventListener('change', () => {
            this.renderRestaurantList();
        });
        
        // Add restaurant button
        document.getElementById('add-restaurant-btn')?.addEventListener('click', () => {
            this.openRestaurantModal();
        });
        
        // Save restaurant button
        document.getElementById('save-restaurant-btn')?.addEventListener('click', () => {
            this.saveRestaurant();
        });
        
        // Pick location button
        document.getElementById('pick-location-btn')?.addEventListener('click', () => {
            const lat = parseFloat(document.getElementById('restaurant-lat').value) || null;
            const lng = parseFloat(document.getElementById('restaurant-lng').value) || null;
            MapManager.enableLocationPicking(lat, lng);
            
            // Close modal temporarily
            UI.hideModal('restaurant-modal');
            
            // Listen for location selection
            const locationHandler = () => {
                UI.showModal('restaurant-modal');
                MapManager.disableLocationPicking();
                MapManager.map.off('click', locationHandler);
            };
            
            setTimeout(() => {
                MapManager.map.on('click', locationHandler);
            }, 500);
        });
        
        // Settings button
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            ReviewersManager.renderSettingsReviewersList();
            UI.showModal('settings-modal');
        });
        
        // Add reviewer in settings
        document.getElementById('add-reviewer-settings-btn')?.addEventListener('click', async () => {
            const name = prompt('輸入名字 / Enter name:');
            if (name && name.trim()) {
                await ReviewersManager.createReviewer(name.trim());
                ReviewersManager.renderSettingsReviewersList();
            }
        });
        
        // Export data
        document.getElementById('export-data-btn')?.addEventListener('click', async () => {
            const data = await SupabaseClient.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tko-foodmap-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            UI.showToast('數據已匯出', 'success');
        });
        
        // Import data
        document.getElementById('import-data-btn')?.addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        
        document.getElementById('import-file')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    StorageManager.importData(data);
                    await this.refreshData();
                    UI.showToast('數據已匯入', 'success');
                } catch (err) {
                    UI.showToast('匯入失敗：' + err.message, 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
        
        // Switch reviewer button
        document.getElementById('switch-reviewer-btn')?.addEventListener('click', () => {
            ReviewersManager.renderSettingsReviewersList();
            UI.showModal('settings-modal');
        });
        
        // Add review from detail button
        document.getElementById('add-review-from-detail-btn')?.addEventListener('click', () => {
            if (this.currentDetailRestaurant) {
                // Hide the restaurant detail modal first
                UI.hideModal('restaurant-detail-modal');
                ReviewModalManager.init(this.currentDetailRestaurant);
            }
        });
        
        // FAB add review button - show restaurant selector
        document.getElementById('fab-add-review')?.addEventListener('click', () => {
            // If a restaurant is selected/viewed, open review for it
            if (this.currentDetailRestaurant) {
                // Hide the restaurant detail modal first
                UI.hideModal('restaurant-detail-modal');
                ReviewModalManager.init(this.currentDetailRestaurant);
            } else {
                UI.showToast('請先選擇餐廳', 'info');
            }
        });
        
        // Restaurant form enter key
        document.getElementById('restaurant-name')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.saveRestaurant();
            }
        });
    },
    
    // Open restaurant modal
    openRestaurantModal(restaurant = null) {
        UI.hideAllModals();
        
        // Reset form
        document.getElementById('restaurant-id').value = '';
        document.getElementById('restaurant-name').value = '';
        document.getElementById('restaurant-cuisine').value = '';
        document.getElementById('restaurant-address').value = '';
        document.getElementById('restaurant-lat').value = '';
        document.getElementById('restaurant-lng').value = '';
        MapManager.clearSelectedLocation();
        
        document.getElementById('restaurant-modal-title').textContent = '新增餐廳';
        
        if (restaurant) {
            // Edit mode
            document.getElementById('restaurant-id').value = restaurant.id;
            document.getElementById('restaurant-name').value = restaurant.name;
            document.getElementById('restaurant-cuisine').value = restaurant.cuisine;
            document.getElementById('restaurant-address').value = restaurant.address || '';
            document.getElementById('restaurant-modal-title').textContent = '編輯餐廳';
            
            if (restaurant.lat && restaurant.lng) {
                document.getElementById('restaurant-lat').value = restaurant.lat;
                document.getElementById('restaurant-lng').value = restaurant.lng;
                document.getElementById('location-status').textContent = 
                    `緯度：${restaurant.lat.toFixed(6)}, 經度：${restaurant.lng.toFixed(6)}`;
            }
        }
        
        UI.showModal('restaurant-modal');
    },
    
    // Save restaurant
    async saveRestaurant() {
        const id = document.getElementById('restaurant-id').value;
        const name = document.getElementById('restaurant-name').value.trim();
        const cuisine = document.getElementById('restaurant-cuisine').value;
        const address = document.getElementById('restaurant-address').value.trim();
        const lat = parseFloat(document.getElementById('restaurant-lat').value) || null;
        const lng = parseFloat(document.getElementById('restaurant-lng').value) || null;
        
        if (!name) {
            UI.showToast('請輸入餐廳名稱', 'error');
            return;
        }
        
        if (!cuisine) {
            UI.showToast('請選擇菜系', 'error');
            return;
        }
        
        const restaurantData = { name, cuisine, address, lat, lng };
        
        let result;
        if (id) {
            // Update existing
            result = await SupabaseClient.updateRestaurant(id, restaurantData);
        } else {
            // Add new
            result = await SupabaseClient.addRestaurant(restaurantData);
        }
        
        if (result) {
            UI.showToast(id ? '餐廳已更新' : '餐廳已新增', 'success');
            UI.hideModal('restaurant-modal');
            await this.refreshData();
        } else {
            UI.showToast('儲存失敗，請重試', 'error');
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
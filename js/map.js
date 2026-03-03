// Map Manager
// Handles Leaflet map for restaurant locations

const MapManager = {
    map: null,
    markers: {},
    selectedLocation: null,
    tempMarker: null,
    
    // Initialize map centered on Tseung Kwan O
    init() {
        // Tseung Kwan O MTR station coordinates
        const tkoStation = [22.3077, 114.2615];
        
        this.map = L.map('map', {
            center: tkoStation,
            zoom: 15
        });
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
        
        // Handle map click for location picking
        this.map.on('click', (e) => {
            if (this.isPickingLocation) {
                this.selectLocation(e.latlng);
            }
        });
        
        // Fix map rendering issues on resize/orientation change
        // This is critical for mobile devices
        this.setupResizeHandler();
        
        // Initial invalidate after a short delay to ensure container is properly sized
        setTimeout(() => {
            this.invalidateSize();
        }, 100);
        
        return this.map;
    },
    
    // Setup resize handler to fix map rendering
    setupResizeHandler() {
        // Debounce function
        let resizeTimeout;
        const debouncedInvalidate = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.invalidateSize();
            }, 150);
        };
        
        // Listen for window resize
        window.addEventListener('resize', debouncedInvalidate);
        
        // Listen for orientation change (important for mobile)
        window.addEventListener('orientationchange', () => {
            // Need longer delay for orientation change
            setTimeout(() => {
                this.invalidateSize();
            }, 300);
        });
        
        // Also invalidate when visibility changes (e.g., when app loads)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => {
                    this.invalidateSize();
                }, 100);
            }
        });
    },
    
    // Invalidate map size - fixes rendering issues
    invalidateSize() {
        if (this.map) {
            this.map.invalidateSize(true);
        }
    },
    
    // Add restaurant marker
    addMarker(restaurant) {
        if (!restaurant.lat || !restaurant.lng) return null;
        
        const marker = L.marker([restaurant.lat, restaurant.lng], {
            title: restaurant.name
        }).addTo(this.map);
        
        // Create popup content
        const avgRating = this.calculateAverageRating(restaurant);
        const ratingStars = this.renderStars(avgRating);
        const reviewCount = restaurant.reviews ? restaurant.reviews.length : 0;
        
        const popupContent = `
            <div class="popup-restaurant">
                <h3>${this.escapeHtml(restaurant.name)}</h3>
                <div class="popup-cuisine">${this.escapeHtml(restaurant.cuisine)}</div>
                <div class="popup-rating">
                    <span class="popup-stars">${ratingStars}</span>
                    <span class="popup-score">${avgRating.toFixed(1)}</span>
                    <span class="popup-count">(${reviewCount} 則評論)</span>
                </div>
                <div class="popup-actions">
                    <button class="btn btn-small btn-primary" onclick="MapManager.openReview('${restaurant.id}'); return false;">📝 評論</button>
                    <button class="btn btn-small btn-secondary" onclick="App.showRestaurantDetail('${restaurant.id}'); return false;">詳情</button>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent, {
            autoClose: false,
            closeOnClick: false,
            maxWidth: 280
        });
        
        this.markers[restaurant.id] = marker;
        return marker;
    },
    
    // Open review modal for a restaurant from popup
    openReview(restaurantId) {
        const restaurant = App.restaurants.find(r => r.id === restaurantId);
        if (restaurant) {
            // Close the popup first
            if (this.markers[restaurantId]) {
                this.markers[restaurantId].closePopup();
            }
            // Open review modal
            ReviewModalManager.init(restaurant);
        }
    },
    
    // Remove marker
    removeMarker(restaurantId) {
        if (this.markers[restaurantId]) {
            this.map.removeLayer(this.markers[restaurantId]);
            delete this.markers[restaurantId];
        }
    },
    
    // Update all markers
    updateMarkers(restaurants) {
        // Clear existing markers
        Object.values(this.markers).forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = {};
        
        // Add new markers
        restaurants.forEach(restaurant => {
            this.addMarker(restaurant);
        });
    },
    
    // Focus on restaurant
    focusOnRestaurant(lat, lng) {
        if (lat && lng) {
            this.map.flyTo([lat, lng], 17);
        }
    },
    
    // Enable location picking mode
    enableLocationPicking(currentLat, currentLng) {
        this.isPickingLocation = true;
        
        // Update cursor
        this.map.getContainer().style.cursor = 'crosshair';
        
        // Add temp marker if coordinates exist
        if (currentLat && currentLng) {
            this.selectLocation({ lat: currentLat, lng: currentLng });
        }
        
        UI.showToast('請在地圖上點擊選擇位置', 'info');
    },
    
    // Disable location picking mode
    disableLocationPicking() {
        this.isPickingLocation = false;
        this.map.getContainer().style.cursor = '';
    },
    
    // Select location
    selectLocation(latlng) {
        this.selectedLocation = latlng;
        
        // Remove temp marker
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
        }
        
        // Add new temp marker
        this.tempMarker = L.marker([latlng.lat, latlng.lng]).addTo(this.map);
        
        // Update status
        const statusEl = document.getElementById('location-status');
        if (statusEl) {
            statusEl.textContent = `緯度：${latlng.lat.toFixed(6)}, 經度：${latlng.lng.toFixed(6)}`;
            statusEl.style.color = 'var(--success-color)';
        }
        
        // Update hidden inputs
        document.getElementById('restaurant-lat').value = latlng.lat;
        document.getElementById('restaurant-lng').value = latlng.lng;
    },
    
    // Get selected location
    getSelectedLocation() {
        return this.selectedLocation;
    },
    
    // Clear selected location
    clearSelectedLocation() {
        this.selectedLocation = null;
        
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
            this.tempMarker = null;
        }
        
        const statusEl = document.getElementById('location-status');
        if (statusEl) {
            statusEl.textContent = '未選擇位置';
            statusEl.style.color = 'var(--text-secondary)';
        }
    },
    
    // Calculate average rating for restaurant
    calculateAverageRating(restaurant) {
        if (!restaurant.reviews || restaurant.reviews.length === 0) {
            return 0;
        }
        
        let totalRating = 0;
        let ratingCount = 0;
        
        restaurant.reviews.forEach(review => {
            if (review.ratings) {
                Object.values(review.ratings).forEach(rating => {
                    if (rating !== null && rating !== undefined) {
                        totalRating += rating;
                        ratingCount++;
                    }
                });
            }
        });
        
        return ratingCount > 0 ? totalRating / ratingCount : 0;
    },
    
    // Render star icons for rating (out of 10)
    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalf = rating % 1 >= 0.5;
        const emptyStars = 10 - fullStars - (hasHalf ? 1 : 0);
        
        return '★'.repeat(fullStars) + (hasHalf ? '½' : '') + '☆'.repeat(emptyStars);
    },
    
    // Escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
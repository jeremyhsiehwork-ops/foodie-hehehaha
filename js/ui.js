// UI Manager
// Handles common UI operations

const UI = {
    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const messageEl = toast.querySelector('.toast-message');
        
        messageEl.textContent = message;
        toast.className = 'toast';
        toast.classList.add(type);
        toast.classList.add('active');
        
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    },
    
    // Show modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },
    
    // Hide modal
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    // Hide all modals
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    },
    
    // Setup modal close handlers
    setupModalHandlers() {
        // Close button handlers
        document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = btn.dataset.modal;
                if (modalId) {
                    this.hideModal(modalId);
                }
            });
        });
        
        // Close on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    },
    
    // Render restaurant list
    renderRestaurantList(restaurants, filters = {}) {
        const container = document.getElementById('restaurant-list');
        if (!container) return;
        
        let filtered = restaurants;
        
        // Apply filters
        if (filters.cuisine) {
            filtered = filtered.filter(r => r.cuisine === filters.cuisine);
        }
        
        if (filters.minRating) {
            filtered = filtered.filter(r => {
                const avgRating = this.calculateAverageRating(r);
                return avgRating >= filters.minRating;
            });
        }
        
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(r => 
                r.name.toLowerCase().includes(searchLower) ||
                r.cuisine.toLowerCase().includes(searchLower) ||
                (r.address && r.address.toLowerCase().includes(searchLower))
            );
        }
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-utensils"></i>
                    <p>暫無餐廳</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filtered.map(restaurant => {
            const avgRating = this.calculateAverageRating(restaurant);
            const reviewCount = restaurant.reviews ? restaurant.reviews.length : 0;
            
            return `
                <div class="restaurant-card" data-id="${restaurant.id}">
                    <div class="restaurant-card-header">
                        <span class="restaurant-name">${this.escapeHtml(restaurant.name)}</span>
                        <span class="restaurant-cuisine">${this.escapeHtml(restaurant.cuisine)}</span>
                    </div>
                    <div class="restaurant-rating">
                        <span class="rating-stars">${this.renderStars(avgRating)}</span>
                        <span class="rating-value">${avgRating.toFixed(1)}</span>
                        <span class="review-count">(${reviewCount} 評論)</span>
                    </div>
                    <div class="restaurant-address">
                        <i class="fas fa-map-marker-alt"></i>
                        ${this.escapeHtml(restaurant.address || '地址不詳')}
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        container.querySelectorAll('.restaurant-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                App.showRestaurantDetail(id);
            });
        });
    },
    
    // Calculate average rating
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
    
    // Render stars for 10-point scale
    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalf = rating % 1 >= 0.5;
        const emptyStars = 10 - fullStars - (hasHalf ? 1 : 0);
        
        return '★'.repeat(fullStars) + (hasHalf ? '½' : '') + '☆'.repeat(emptyStars);
    },
    
    // Render review card
    renderReviewCard(review, reviewer) {
        const reviewerName = reviewer ? reviewer.name : '未知';
        const reviewerInitial = reviewerName.charAt(0).toUpperCase();
        const date = review.createdAt ? new Date(review.createdAt).toLocaleDateString('zh-HK') : '';
        
        return `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-reviewer">
                        <div class="review-reviewer-avatar">${reviewerInitial}</div>
                        <div>
                            <div class="review-reviewer-name">${this.escapeHtml(reviewerName)}</div>
                            <div class="review-date">${date}</div>
                        </div>
                    </div>
                    ${review.totalSpend ? `<span class="review-spend">$${review.totalSpend}</span>` : ''}
                </div>
                
                ${review.dishes && review.dishes.length > 0 ? `
                    <div class="review-dishes">
                        ${review.dishes.map(dish => `<span class="dish-tag-small">${this.escapeHtml(dish)}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="review-ratings">
                    ${this.renderRatingItem('😋', '好味', review.ratings?.taste)}
                    ${this.renderRatingItem('💵', '性價比', review.ratings?.value)}
                    ${this.renderRatingItem('🙋', '服務', review.ratings?.service)}
                    ${this.renderRatingItem('🏠', '環境', review.ratings?.environment)}
                    ${this.renderRatingItem('🎨', '擺盤', review.ratings?.presentation)}
                    ${this.renderRatingItem('🎯', '預期', review.ratings?.expectations)}
                    ${this.renderRatingItem('🔄', '翻兜', review.ratings?.returnRate)}
                </div>
                
                ${review.opinions ? `
                    <div class="review-opinions">
                        ${review.opinions.portion ? `<span class="opinion-tag">🥘 ${review.opinions.portion}</span>` : ''}
                        ${review.opinions.speed ? `<span class="opinion-tag">⚡ ${review.opinions.speed}</span>` : ''}
                        ${review.opinions.variety ? `<span class="opinion-tag">📋 ${review.opinions.variety}</span>` : ''}
                    </div>
                ` : ''}
                
                ${review.comment ? `
                    <div class="review-comment">${this.escapeHtml(review.comment)}</div>
                ` : ''}
            </div>
        `;
    },
    
    // Render single rating item
    renderRatingItem(icon, label, value) {
        if (value === null || value === undefined) return '';
        return `
            <div class="review-rating-item">
                <span class="review-rating-icon">${icon}</span>
                <span class="review-rating-value">${value.toFixed(1)}</span>
            </div>
        `;
    },
    
    // Render review summary in modal
    renderReviewSummary(data) {
        const container = document.getElementById('summary-content');
        if (!container) return;
        
        const ratings = data.ratings || {};
        const opinions = data.opinions || {};
        
        container.innerHTML = `
            <div class="summary-item">
                <span class="summary-icon">😋</span>
                <span>好味：${ratings.taste?.toFixed(1) || '-'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-icon">💵</span>
                <span>性價比：${ratings.value?.toFixed(1) || '-'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-icon">🙋</span>
                <span>服務：${ratings.service?.toFixed(1) || '-'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-icon">🏠</span>
                <span>環境：${ratings.environment?.toFixed(1) || '-'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-icon">🎨</span>
                <span>擺盤：${ratings.presentation?.toFixed(1) || '-'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-icon">🎯</span>
                <span>預期：${ratings.expectations?.toFixed(1) || '-'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-icon">🔄</span>
                <span>翻兜：${ratings.returnRate?.toFixed(1) || '-'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-icon">💰</span>
                <span>消費：${data.totalSpend ? '$' + data.totalSpend : '-'}</span>
            </div>
        `;
    },
    
    // Render restaurant detail modal
    renderRestaurantDetail(restaurant, reviews, allReviewers) {
        // Set basic info
        document.getElementById('detail-restaurant-name').textContent = restaurant.name;
        document.getElementById('detail-cuisine').textContent = restaurant.cuisine;
        document.getElementById('detail-address').textContent = restaurant.address || '地址不詳';
        
        // Calculate overall rating
        const avgRating = this.calculateAverageRating(restaurant);
        const reviewCount = reviews.length;
        
        document.getElementById('detail-overall-rating').innerHTML = `
            <div class="overall-score">${avgRating.toFixed(1)}</div>
            <div class="overall-stars">${this.renderStars(avgRating)}</div>
            <div class="review-count">${reviewCount} 評論</div>
        `;
        
        // Render stats
        const stats = this.calculateStats(reviews);
        document.getElementById('detail-stats').innerHTML = `
            <div class="stat-item">
                <div class="stat-icon">😋</div>
                <div class="stat-value">${stats.taste.toFixed(1)}</div>
                <div class="stat-label">好味</div>
            </div>
            <div class="stat-item">
                <div class="stat-icon">💵</div>
                <div class="stat-value">${stats.value.toFixed(1)}</div>
                <div class="stat-label">性價比</div>
            </div>
            <div class="stat-item">
                <div class="stat-icon">🙋</div>
                <div class="stat-value">${stats.service.toFixed(1)}</div>
                <div class="stat-label">服務</div>
            </div>
            <div class="stat-item">
                <div class="stat-icon">🏠</div>
                <div class="stat-value">${stats.environment.toFixed(1)}</div>
                <div class="stat-label">環境</div>
            </div>
        `;
        
        // Render reviews
        const reviewsList = document.getElementById('reviews-list');
        if (reviews.length === 0) {
            reviewsList.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">暫無評論</p>';
        } else {
            reviewsList.innerHTML = reviews.map(review => {
                const reviewer = allReviewers.find(r => r.id === review.reviewerId);
                return this.renderReviewCard(review, reviewer);
            }).join('');
        }
    },
    
    // Calculate stats from reviews
    calculateStats(reviews) {
        const stats = {
            taste: 0,
            value: 0,
            service: 0,
            environment: 0,
            presentation: 0,
            expectations: 0,
            returnRate: 0
        };
        
        let count = 0;
        
        reviews.forEach(review => {
            if (review.ratings) {
                if (review.ratings.taste) { stats.taste += review.ratings.taste; count++; }
                if (review.ratings.value) { stats.value += review.ratings.value; count++; }
                if (review.ratings.service) { stats.service += review.ratings.service; count++; }
                if (review.ratings.environment) { stats.environment += review.ratings.environment; count++; }
                if (review.ratings.presentation) { stats.presentation += review.ratings.presentation; count++; }
                if (review.ratings.expectations) { stats.expectations += review.ratings.expectations; count++; }
                if (review.ratings.returnRate) { stats.returnRate += review.ratings.returnRate; count++; }
            }
        });
        
        if (count > 0) {
            stats.taste /= count;
            stats.value /= count;
            stats.service /= count;
            stats.environment /= count;
        }
        
        return stats;
    },
    
    // Escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
// Review Modal Manager
// Handles the 5-step review modal flow

const ReviewModalManager = {
    currentRestaurant: null,
    currentStep: 1,
    reviewData: {
        restaurantId: null,
        totalSpend: null,
        dishes: [],
        ratings: {
            taste: 5,
            value: 5,
            service: 5,
            environment: 5,
            presentation: 5,
            expectations: 5,
            returnRate: 5
        },
        opinions: {
            portion: '足夠',
            speed: '正常',
            variety: '夠'
        },
        comment: '',
        reviewerId: null
    },
    
    // Initialize review modal for a restaurant
    init(restaurant) {
        this.currentRestaurant = restaurant;
        this.currentStep = 1;
        this.resetReviewData();
        this.reviewData.restaurantId = restaurant.id;
        this.reviewData.reviewerId = ReviewersManager.currentReviewerId;
        
        // Set restaurant name
        document.getElementById('review-restaurant-name').value = restaurant.name;
        
        // Initialize rating sliders
        this.initRatingSliders();
        
        // Initialize opinion buttons
        this.initOpinionButtons();
        
        // Show first modal
        UI.showModal('review-modal-1');
    },
    
    // Reset review data
    resetReviewData() {
        this.reviewData = {
            restaurantId: this.reviewData.restaurantId,
            totalSpend: null,
            dishes: [],
            ratings: {
                taste: 5,
                value: 5,
                service: 5,
                environment: 5,
                presentation: 5,
                expectations: 5,
                returnRate: 5
            },
            opinions: {
                portion: '足夠',
                speed: '正常',
                variety: '夠'
            },
            comment: '',
            reviewerId: ReviewersManager.currentReviewerId
        };
    },
    
    // Initialize rating sliders
    initRatingSliders() {
        document.querySelectorAll('.rating-slider').forEach(slider => {
            const container = slider.closest('.star-rating-10');
            const category = container.dataset.category;
            const valueDisplay = container.querySelector('.star-value');
            const iconsDisplay = container.querySelector('.star-icons');
            
            // Set initial value
            slider.value = this.reviewData.ratings[category] || 5;
            this.updateStarDisplay(slider.value, valueDisplay, iconsDisplay);
            
            // Add event listener
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.reviewData.ratings[category] = value;
                this.updateStarDisplay(value, valueDisplay, iconsDisplay);
            });
        });
    },
    
    // Update star display
    updateStarDisplay(value, valueEl, iconsEl) {
        const numValue = parseFloat(value) || 5;
        valueEl.textContent = numValue.toFixed(1);
        
        const fullStars = Math.floor(numValue);
        const hasHalf = numValue % 1 >= 0.5;
        const emptyStars = 10 - fullStars - (hasHalf ? 1 : 0);
        
        iconsEl.textContent = '★'.repeat(fullStars) + (hasHalf ? '½' : '') + '☆'.repeat(emptyStars);
    },
    
    // Initialize opinion buttons
    initOpinionButtons() {
        document.querySelectorAll('.opinion-options').forEach(container => {
            const category = container.dataset.category;
            const buttons = container.querySelectorAll('.opinion-btn');
            
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Remove active from siblings
                    buttons.forEach(b => b.classList.remove('active'));
                    // Add active to clicked
                    btn.classList.add('active');
                    // Update data
                    this.reviewData.opinions[category] = btn.dataset.value;
                });
            });
        });
    },
    
    // Go to next step
    nextStep() {
        if (this.currentStep >= 5) return;
        
        // Validate current step
        if (!this.validateStep(this.currentStep)) return;
        
        // Hide current modal
        UI.hideModal(`review-modal-${this.currentStep}`);
        
        // Update step
        this.currentStep++;
        
        // Show next modal
        UI.showModal(`review-modal-${this.currentStep}`);
        
        // Update summary if on step 5
        if (this.currentStep === 5) {
            this.updateSummary();
            ReviewersManager.renderReviewerSelect(document.getElementById('review-reviewer'));
        }
    },
    
    // Go to previous step
    prevStep() {
        if (this.currentStep <= 1) return;
        
        // Hide current modal
        UI.hideModal(`review-modal-${this.currentStep}`);
        
        // Update step
        this.currentStep--;
        
        // Show previous modal
        UI.showModal(`review-modal-${this.currentStep}`);
    },
    
    // Validate step
    validateStep(step) {
        switch (step) {
            case 1:
                // Validate basic info
                const spend = document.getElementById('review-total-spend').value;
                this.reviewData.totalSpend = spend ? parseInt(spend) : null;
                return true;
            case 2:
            case 3:
            case 4:
                return true;
            case 5:
                this.reviewData.comment = document.getElementById('review-comment').value;
                this.reviewData.reviewerId = document.getElementById('review-reviewer').value;
                return true;
            default:
                return true;
        }
    },
    
    // Update summary
    updateSummary() {
        UI.renderReviewSummary(this.reviewData);
    },
    
    // Submit review
    async submitReview() {
        // Validate final data
        this.reviewData.comment = document.getElementById('review-comment').value;
        this.reviewData.reviewerId = document.getElementById('review-reviewer').value;
        
        if (!this.reviewData.reviewerId) {
            UI.showToast('請選擇評分者', 'error');
            return;
        }
        
        // Create review object
        const review = {
            restaurantId: this.reviewData.restaurantId,
            reviewerId: this.reviewData.reviewerId,
            totalSpend: this.reviewData.totalSpend,
            dishes: this.reviewData.dishes,
            comment: this.reviewData.comment,
            ratings: this.reviewData.ratings,
            opinions: this.reviewData.opinions
        };
        
        // Save review
        const result = await SupabaseClient.addReview(review);
        
        if (result) {
            UI.showToast('評論已提交！', 'success');
            UI.hideAllModals();
            
            // Refresh data
            await App.refreshData();
            
            // Show restaurant detail if open
            if (this.currentRestaurant) {
                setTimeout(() => {
                    App.showRestaurantDetail(this.currentRestaurant.id);
                }, 500);
            }
        } else {
            UI.showToast('提交失敗，請重試', 'error');
        }
    },
    
    // Add dish to list
    addDish(dishName) {
        if (!dishName || !dishName.trim()) return;
        
        const name = dishName.trim();
        if (!this.reviewData.dishes.includes(name)) {
            this.reviewData.dishes.push(name);
            this.renderDishTags();
        }
    },
    
    // Remove dish from list
    removeDish(index) {
        this.reviewData.dishes.splice(index, 1);
        this.renderDishTags();
    },
    
    // Render dish tags
    renderDishTags() {
        const container = document.getElementById('dishes-tags');
        if (!container) return;
        
        container.innerHTML = this.reviewData.dishes.map((dish, index) => `
            <span class="dish-tag">
                ${this.escapeHtml(dish)}
                <button type="button" onclick="ReviewModalManager.removeDish(${index})">&times;</button>
            </span>
        `).join('');
    },
    
    // Escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Setup event handlers for review modals
document.addEventListener('DOMContentLoaded', () => {
    // Step navigation buttons
    document.getElementById('review-step1-next')?.addEventListener('click', () => {
        const spend = document.getElementById('review-total-spend').value;
        ReviewModalManager.reviewData.totalSpend = spend ? parseInt(spend) : null;
        ReviewModalManager.nextStep();
    });
    
    document.getElementById('review-step2-next')?.addEventListener('click', () => {
        ReviewModalManager.nextStep();
    });
    
    document.getElementById('review-step3-next')?.addEventListener('click', () => {
        ReviewModalManager.nextStep();
    });
    
    document.getElementById('review-step4-next')?.addEventListener('click', () => {
        ReviewModalManager.nextStep();
    });
    
    // Submit review button
    document.getElementById('submit-review-btn')?.addEventListener('click', () => {
        ReviewModalManager.submitReview();
    });
    
    // Add dish button
    document.getElementById('add-dish-btn')?.addEventListener('click', () => {
        const input = document.getElementById('review-dish-input');
        ReviewModalManager.addDish(input.value);
        input.value = '';
    });
    
    // Add dish on Enter key
    document.getElementById('review-dish-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            ReviewModalManager.addDish(e.target.value);
            e.target.value = '';
        }
    });
    
    // Back buttons
    document.querySelectorAll('.modal-footer .btn-secondary').forEach(btn => {
        if (btn.textContent.includes('上一步') || btn.textContent.includes('Back')) {
            btn.addEventListener('click', () => {
                ReviewModalManager.prevStep();
            });
        }
    });
});
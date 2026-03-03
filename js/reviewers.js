// Reviewers Manager
// Handles reviewer selection and management

const ReviewersManager = {
    currentReviewerId: null,
    reviewers: [],
    
    // Initialize reviewers
    async init() {
        this.reviewers = await SupabaseClient.getReviewers();
        this.currentReviewerId = StorageManager.get('currentReviewerId');
        
        // Always show setup page as landing page
        this.showSetupPage();
        
        return true;
    },
    
    // Show setup page
    showSetupPage() {
        document.getElementById('setup-page').classList.add('active');
        document.getElementById('main-page').classList.remove('active');
        this.renderReviewersGrid();
    },
    
    // Hide setup page and show main app
    showMainPage() {
        document.getElementById('setup-page').classList.remove('active');
        document.getElementById('main-page').classList.add('active');
        this.updateCurrentReviewerDisplay();
    },
    
    // Render reviewers grid on setup page
    renderReviewersGrid() {
        const grid = document.getElementById('reviewers-grid');
        const section = document.getElementById('existing-reviewers-section');
        
        if (this.reviewers.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';
        grid.innerHTML = this.reviewers.map(reviewer => `
            <div class="reviewer-card" data-id="${reviewer.id}">
                <div class="avatar">${reviewer.name.charAt(0).toUpperCase()}</div>
                <div class="name">${this.escapeHtml(reviewer.name)}</div>
            </div>
        `).join('');
        
        // Add click handlers
        grid.querySelectorAll('.reviewer-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                this.selectReviewer(id);
            });
        });
    },
    
    // Create new reviewer
    async createReviewer(name) {
        if (!name || !name.trim()) {
            UI.showToast('請輸入名字 / Please enter a name', 'error');
            return null;
        }
        
        const reviewer = {
            name: name.trim(),
            avatar: '👤'
        };
        
        const newReviewer = await SupabaseClient.addReviewer(reviewer);
        this.reviewers.push(newReviewer);
        this.renderReviewersGrid();
        
        return newReviewer;
    },
    
    // Select reviewer
    selectReviewer(id) {
        this.currentReviewerId = id;
        StorageManager.set('currentReviewerId', id);
        
        // Update UI
        document.querySelectorAll('.reviewer-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.id === id);
        });
        
        // Show main page after short delay
        setTimeout(() => {
            this.showMainPage();
        }, 300);
    },
    
    // Get current reviewer
    getCurrentReviewer() {
        return this.reviewers.find(r => r.id === this.currentReviewerId) || null;
    },
    
    // Get reviewer by ID
    getReviewerById(id) {
        return this.reviewers.find(r => r.id === id) || null;
    },
    
    // Update current reviewer display in header
    updateCurrentReviewerDisplay() {
        const reviewer = this.getCurrentReviewer();
        const nameEl = document.getElementById('current-reviewer-name');
        
        if (reviewer) {
            nameEl.textContent = reviewer.name;
        }
    },
    
    // Render reviewer select dropdown
    renderReviewerSelect(selectElement) {
        selectElement.innerHTML = this.reviewers.map(reviewer => `
            <option value="${reviewer.id}" ${reviewer.id === this.currentReviewerId ? 'selected' : ''}>
                ${this.escapeHtml(reviewer.name)}
            </option>
        `).join('');
    },
    
    // Render reviewers list in settings
    renderSettingsReviewersList() {
        const container = document.getElementById('settings-reviewers-list');
        
        if (this.reviewers.length === 0) {
            container.innerHTML = '<p class="text-muted">暫無評分者</p>';
            return;
        }
        
        container.innerHTML = this.reviewers.map(reviewer => `
            <div class="reviewer-item" data-id="${reviewer.id}">
                <div class="reviewer-item-info">
                    <div class="reviewer-item-avatar">${reviewer.name.charAt(0).toUpperCase()}</div>
                    <span class="reviewer-item-name">${this.escapeHtml(reviewer.name)}</span>
                </div>
                <div class="reviewer-item-actions">
                    ${reviewer.id !== this.currentReviewerId ? `
                        <button class="btn btn-small btn-primary" onclick="ReviewersManager.switchTo('${reviewer.id}')">
                            切換
                        </button>
                    ` : ''}
                    <button class="btn btn-small btn-secondary" onclick="ReviewersManager.editReviewer('${reviewer.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${this.reviewers.length > 1 ? `
                        <button class="btn btn-small btn-secondary" onclick="ReviewersManager.deleteReviewer('${reviewer.id}')" style="color: var(--danger-color);">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    },
    
    // Switch to another reviewer
    switchTo(id) {
        this.currentReviewerId = id;
        StorageManager.set('currentReviewerId', id);
        this.updateCurrentReviewerDisplay();
        this.renderSettingsReviewersList();
        UI.showToast('已切換評分者', 'success');
    },
    
    // Edit reviewer name
    async editReviewer(id) {
        const reviewer = this.getReviewerById(id);
        if (!reviewer) return;
        
        const newName = prompt('修改名字 / Edit name:', reviewer.name);
        if (newName && newName.trim() && newName !== reviewer.name) {
            await SupabaseClient.updateReviewer(id, { name: newName.trim() });
            reviewer.name = newName.trim();
            this.renderSettingsReviewersList();
            this.updateCurrentReviewerDisplay();
            UI.showToast('已更新名字', 'success');
        }
    },
    
    // Delete reviewer
    async deleteReviewer(id) {
        if (!confirm('確定刪除此評分者？/ Delete this reviewer?')) return;
        
        await SupabaseClient.deleteReviewer(id);
        this.reviewers = this.reviewers.filter(r => r.id !== id);
        
        // If deleted current reviewer, select first available
        if (id === this.currentReviewerId && this.reviewers.length > 0) {
            this.currentReviewerId = this.reviewers[0].id;
            StorageManager.set('currentReviewerId', this.currentReviewerId);
            this.updateCurrentReviewerDisplay();
        }
        
        this.renderSettingsReviewersList();
        UI.showToast('已刪除評分者', 'success');
    },
    
    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
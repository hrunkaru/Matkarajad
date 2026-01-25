/**
 * Main application module for Harjumaa Matkarajad
 */
const App = {
    state: {
        isLoggedIn: false,
        username: null,
        trails: [],
        userData: {
            version: 1,
            completedTrails: {}
        },
        currentSHA: null,
        filters: {
            category: 'all',
            length: 'all',
            season: 'all',
            location: 'all',
            completed: 'all'
        }
    },

    /**
     * Initialize the application
     */
    async init() {
        await this.loadTrails();
        this.renderFilters();
        this.renderTrails();
        this.bindEvents();

        // Check for existing login
        const hasStoredPAT = await GitHubModule.init();
        if (hasStoredPAT) {
            this.showPasswordPrompt();
        } else {
            this.updateAuthUI();
        }
    },

    /**
     * Load trails data
     */
    async loadTrails() {
        try {
            const response = await fetch('data/trails.json');
            const data = await response.json();
            this.state.trails = data.trails;
        } catch (error) {
            console.error('Failed to load trails:', error);
            this.showMessage('Radade laadimine ebaõnnestus', 'error');
        }
    },

    /**
     * Bind UI events
     */
    bindEvents() {
        // Login button
        document.getElementById('loginBtn')?.addEventListener('click', () => this.showLoginModal());
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Login form
        document.getElementById('patForm')?.addEventListener('submit', (e) => this.handlePATSubmit(e));
        document.getElementById('passwordForm')?.addEventListener('submit', (e) => this.handlePasswordSubmit(e));

        // Filter changes
        document.querySelectorAll('.filter-select').forEach(select => {
            select.addEventListener('change', () => this.applyFilters());
        });

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModals();
            });
        });

        // Trail completion form
        document.getElementById('completionForm')?.addEventListener('submit', (e) => this.handleCompletionSubmit(e));
    },

    /**
     * Show login modal
     */
    showLoginModal() {
        document.getElementById('loginModal').classList.add('active');
        document.getElementById('patStep').classList.remove('hidden');
        document.getElementById('passwordStep').classList.add('hidden');
    },

    /**
     * Show password prompt for returning users
     */
    showPasswordPrompt() {
        document.getElementById('loginModal').classList.add('active');
        document.getElementById('patStep').classList.add('hidden');
        document.getElementById('passwordStep').classList.remove('hidden');

        // Try stored password
        const storedPassword = GitHubModule.getStoredPassword();
        if (storedPassword) {
            document.getElementById('password').value = storedPassword;
            document.getElementById('rememberPassword').checked = true;
        }
    },

    /**
     * Close all modals
     */
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    },

    /**
     * Handle PAT form submission
     */
    async handlePATSubmit(e) {
        e.preventDefault();
        const pat = document.getElementById('pat').value.trim();

        if (!pat) {
            this.showMessage('Palun sisesta Personal Access Token', 'error');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Kontrollin...';

        try {
            const isValid = await GitHubModule.testPAT(pat);
            if (isValid) {
                GitHubModule.storePAT(pat);
                await GitHubModule.init();
                document.getElementById('patStep').classList.add('hidden');
                document.getElementById('passwordStep').classList.remove('hidden');
            } else {
                this.showMessage('Vigane Personal Access Token', 'error');
            }
        } catch (error) {
            this.showMessage('Viga tokeni kontrollimisel', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Jätka';
        }
    },

    /**
     * Handle password form submission
     */
    async handlePasswordSubmit(e) {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const rememberPassword = document.getElementById('rememberPassword').checked;

        const validation = CryptoModule.validatePassword(password);
        if (!validation.valid) {
            this.showMessage(validation.message, 'error');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sisenen...';

        try {
            // Try to fetch and decrypt existing data
            const { content, sha } = await GitHubModule.fetchEncryptedData();
            this.state.currentSHA = sha;

            if (content) {
                // Decrypt existing data
                this.state.userData = await CryptoModule.decrypt(content, password);
            } else {
                // No existing data, create new
                this.state.userData = { version: 1, completedTrails: {} };
                await this.saveUserData(password);
            }

            // Store password if requested
            if (rememberPassword) {
                GitHubModule.storePassword(password);
            } else {
                GitHubModule.clearPassword();
            }

            // Store password temporarily for session
            this.state.password = password;
            this.state.isLoggedIn = true;

            const user = await GitHubModule.getCurrentUser();
            this.state.username = user.login;

            this.closeModals();
            this.updateAuthUI();
            this.renderTrails();
            this.showMessage('Sisse logitud!', 'success');
        } catch (error) {
            if (error.message === 'Vale parool') {
                this.showMessage('Vale parool', 'error');
            } else {
                this.showMessage('Sisselogimine ebaõnnestus: ' + error.message, 'error');
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Logi sisse';
        }
    },

    /**
     * Logout user
     */
    logout() {
        GitHubModule.clearPAT();
        GitHubModule.clearPassword();
        this.state.isLoggedIn = false;
        this.state.username = null;
        this.state.password = null;
        this.state.userData = { version: 1, completedTrails: {} };
        this.state.currentSHA = null;
        this.updateAuthUI();
        this.renderTrails();
        this.showMessage('Välja logitud', 'success');
    },

    /**
     * Update authentication UI
     */
    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');
        const completedFilter = document.getElementById('completedFilterWrapper');

        if (this.state.isLoggedIn) {
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            userInfo.textContent = this.state.username;
            userInfo.classList.remove('hidden');
            completedFilter?.classList.remove('hidden');
        } else {
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            userInfo.classList.add('hidden');
            completedFilter?.classList.add('hidden');
        }
    },

    /**
     * Save user data to GitHub
     */
    async saveUserData(password = null) {
        const pwd = password || this.state.password;
        if (!pwd) return;

        try {
            const encrypted = await CryptoModule.encrypt(this.state.userData, pwd);
            this.state.currentSHA = await GitHubModule.commitEncryptedData(encrypted, this.state.currentSHA);
        } catch (error) {
            this.showMessage('Andmete salvestamine ebaõnnestus: ' + error.message, 'error');
            throw error;
        }
    },

    /**
     * Render filter dropdowns
     */
    renderFilters() {
        // Get unique locations
        const locations = [...new Set(this.state.trails.map(t => t.location))].sort();
        const locationSelect = document.getElementById('filterLocation');
        if (locationSelect) {
            locations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc;
                option.textContent = loc;
                locationSelect.appendChild(option);
            });
        }
    },

    /**
     * Apply filters and re-render trails
     */
    applyFilters() {
        this.state.filters.category = document.getElementById('filterCategory')?.value || 'all';
        this.state.filters.length = document.getElementById('filterLength')?.value || 'all';
        this.state.filters.season = document.getElementById('filterSeason')?.value || 'all';
        this.state.filters.location = document.getElementById('filterLocation')?.value || 'all';
        this.state.filters.completed = document.getElementById('filterCompleted')?.value || 'all';
        this.renderTrails();
    },

    /**
     * Get filtered trails
     */
    getFilteredTrails() {
        return this.state.trails.filter(trail => {
            // Category filter
            if (this.state.filters.category !== 'all' && trail.category !== this.state.filters.category) {
                return false;
            }

            // Length filter
            if (this.state.filters.length !== 'all') {
                const length = trail.length;
                switch (this.state.filters.length) {
                    case 'short': if (length >= 3) return false; break;
                    case 'medium': if (length < 3 || length >= 7) return false; break;
                    case 'long': if (length < 7) return false; break;
                }
            }

            // Season filter
            if (this.state.filters.season !== 'all') {
                const seasonMap = { 'spring': 'kevad', 'summer': 'suvi', 'autumn': 'sügis', 'winter': 'talv' };
                const season = seasonMap[this.state.filters.season];
                if (!trail.seasons.includes(season)) return false;
            }

            // Location filter
            if (this.state.filters.location !== 'all' && trail.location !== this.state.filters.location) {
                return false;
            }

            // Completed filter (only when logged in)
            if (this.state.isLoggedIn && this.state.filters.completed !== 'all') {
                const isCompleted = !!this.state.userData.completedTrails[trail.id];
                if (this.state.filters.completed === 'completed' && !isCompleted) return false;
                if (this.state.filters.completed === 'not-completed' && isCompleted) return false;
            }

            return true;
        });
    },

    /**
     * Render trails list
     */
    renderTrails() {
        const container = document.getElementById('trailsList');
        if (!container) return;

        const trails = this.getFilteredTrails();
        const completedCount = this.state.isLoggedIn
            ? Object.keys(this.state.userData.completedTrails).length
            : 0;

        // Update stats
        document.getElementById('totalTrails').textContent = this.state.trails.length;
        document.getElementById('filteredTrails').textContent = trails.length;
        if (this.state.isLoggedIn) {
            document.getElementById('completedTrails').textContent = completedCount;
            document.getElementById('completedStats').classList.remove('hidden');
        } else {
            document.getElementById('completedStats').classList.add('hidden');
        }

        if (trails.length === 0) {
            container.innerHTML = '<div class="no-results">Ühtegi rada ei leitud valitud filtritega.</div>';
            return;
        }

        container.innerHTML = trails.map(trail => this.renderTrailCard(trail)).join('');

        // Bind trail card events
        container.querySelectorAll('.trail-card').forEach(card => {
            const trailId = card.dataset.trailId;

            card.querySelector('.mark-complete-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showCompletionModal(trailId);
            });

            card.querySelector('.edit-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showCompletionModal(trailId);
            });

            card.querySelector('.remove-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeCompletion(trailId);
            });
        });
    },

    /**
     * Render a single trail card
     */
    renderTrailCard(trail) {
        const isCompleted = this.state.isLoggedIn && this.state.userData.completedTrails[trail.id];
        const completionData = isCompleted ? this.state.userData.completedTrails[trail.id] : null;

        const categoryLabels = {
            'matkarada': 'Matkarada',
            'terviserada': 'Terviserada',
            'loodusrada': 'Loodusrada',
            'õpperada': 'Õpperada'
        };

        const typeLabels = {
            'ring': 'Ring',
            'lineaarne': 'Lineaarne',
            'edasi-tagasi': 'Edasi-tagasi'
        };

        const seasonLabels = {
            'kevad': 'Kevad',
            'suvi': 'Suvi',
            'sügis': 'Sügis',
            'talv': 'Talv'
        };

        return `
            <div class="trail-card ${isCompleted ? 'completed' : ''}" data-trail-id="${trail.id}">
                <div class="trail-header">
                    <h3 class="trail-name">
                        ${isCompleted ? '<span class="completed-icon">✓</span>' : ''}
                        ${trail.name}
                    </h3>
                    <span class="trail-category category-${trail.category}">${categoryLabels[trail.category]}</span>
                </div>

                <div class="trail-info">
                    <div class="trail-meta">
                        <span class="trail-length"><strong>${trail.length} km</strong></span>
                        <span class="trail-type">${typeLabels[trail.type]}</span>
                        <span class="trail-location">${trail.location}</span>
                    </div>
                    <div class="trail-seasons">
                        ${trail.seasons.map(s => `<span class="season-tag">${seasonLabels[s]}</span>`).join('')}
                    </div>
                </div>

                <p class="trail-description">${trail.description}</p>

                ${trail.url ? `<a href="${trail.url}" target="_blank" rel="noopener" class="trail-link">Lisainfo →</a>` : ''}

                ${isCompleted ? `
                    <div class="completion-info">
                        <div class="completion-date">Läbitud: ${this.formatDate(completionData.date)}</div>
                        ${completionData.comment ? `<div class="completion-comment">${this.escapeHtml(completionData.comment)}</div>` : ''}
                    </div>
                ` : ''}

                ${this.state.isLoggedIn ? `
                    <div class="trail-actions">
                        ${isCompleted ? `
                            <button class="btn btn-small edit-btn">Muuda</button>
                            <button class="btn btn-small btn-danger remove-btn">Eemalda</button>
                        ` : `
                            <button class="btn btn-small btn-primary mark-complete-btn">Märgi tehtuks</button>
                        `}
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Show completion modal
     */
    showCompletionModal(trailId) {
        const trail = this.state.trails.find(t => t.id === trailId);
        if (!trail) return;

        const existingData = this.state.userData.completedTrails[trailId];

        document.getElementById('completionTrailId').value = trailId;
        document.getElementById('completionTrailName').textContent = trail.name;
        document.getElementById('completionDate').value = existingData?.date || new Date().toISOString().split('T')[0];
        document.getElementById('completionComment').value = existingData?.comment || '';

        document.getElementById('completionModal').classList.add('active');
    },

    /**
     * Handle completion form submit
     */
    async handleCompletionSubmit(e) {
        e.preventDefault();

        const trailId = document.getElementById('completionTrailId').value;
        const date = document.getElementById('completionDate').value;
        const comment = document.getElementById('completionComment').value.trim();

        if (!date) {
            this.showMessage('Palun vali kuupäev', 'error');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvestan...';

        try {
            this.state.userData.completedTrails[trailId] = {
                date: date,
                comment: comment,
                timestamp: Date.now()
            };

            await this.saveUserData();
            this.closeModals();
            this.renderTrails();
            this.showMessage('Salvestatud!', 'success');
        } catch (error) {
            // Error already shown in saveUserData
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvesta';
        }
    },

    /**
     * Remove trail completion
     */
    async removeCompletion(trailId) {
        if (!confirm('Kas oled kindel, et soovid selle raja märke eemaldada?')) {
            return;
        }

        try {
            delete this.state.userData.completedTrails[trailId];
            await this.saveUserData();
            this.renderTrails();
            this.showMessage('Eemaldatud!', 'success');
        } catch (error) {
            // Error already shown in saveUserData
        }
    },

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('et-EE', { year: 'numeric', month: 'long', day: 'numeric' });
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Show a message to the user
     */
    showMessage(text, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) return;

        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.textContent = text;

        container.appendChild(message);

        setTimeout(() => {
            message.classList.add('fade-out');
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

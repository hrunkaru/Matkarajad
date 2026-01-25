/**
 * GitHub API module for storing encrypted user data
 */
const GitHubModule = {
    REPO_OWNER: null,
    REPO_NAME: 'Matkarajad',
    DATA_FILE_PATH: 'data/user-data.json.encrypted',

    /**
     * Initialize with repository owner from current user
     */
    async init() {
        const pat = this.getStoredPAT();
        if (pat) {
            try {
                const user = await this.getCurrentUser();
                this.REPO_OWNER = user.login;
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    },

    /**
     * Store PAT in localStorage
     */
    storePAT(pat) {
        localStorage.setItem('matkarajad_pat', pat);
    },

    /**
     * Get stored PAT
     */
    getStoredPAT() {
        return localStorage.getItem('matkarajad_pat');
    },

    /**
     * Clear stored PAT
     */
    clearPAT() {
        localStorage.removeItem('matkarajad_pat');
    },

    /**
     * Store password in localStorage (optional)
     */
    storePassword(password) {
        localStorage.setItem('matkarajad_password', password);
    },

    /**
     * Get stored password
     */
    getStoredPassword() {
        return localStorage.getItem('matkarajad_password');
    },

    /**
     * Clear stored password
     */
    clearPassword() {
        localStorage.removeItem('matkarajad_password');
    },

    /**
     * Get current authenticated user
     */
    async getCurrentUser() {
        const pat = this.getStoredPAT();
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${pat}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('Autentimine ebaõnnestus');
        }

        return response.json();
    },

    /**
     * Test if PAT is valid
     */
    async testPAT(pat) {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${pat}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            return response.ok;
        } catch {
            return false;
        }
    },

    /**
     * Get repository data file URL
     */
    getDataFileURL() {
        return `https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents/${this.DATA_FILE_PATH}`;
    },

    /**
     * Fetch encrypted user data from GitHub
     */
    async fetchEncryptedData() {
        const pat = this.getStoredPAT();
        if (!pat || !this.REPO_OWNER) {
            throw new Error('Pole sisse logitud');
        }

        const response = await fetch(this.getDataFileURL(), {
            headers: {
                'Authorization': `Bearer ${pat}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.status === 404) {
            return { content: null, sha: null };
        }

        if (!response.ok) {
            throw new Error('Andmete laadimine ebaõnnestus');
        }

        const data = await response.json();
        const content = atob(data.content.replace(/\n/g, ''));
        return { content, sha: data.sha };
    },

    /**
     * Commit encrypted data to GitHub
     */
    async commitEncryptedData(encryptedContent, sha = null) {
        const pat = this.getStoredPAT();
        if (!pat || !this.REPO_OWNER) {
            throw new Error('Pole sisse logitud');
        }

        const body = {
            message: 'Update user trail data',
            content: btoa(encryptedContent)
        };

        if (sha) {
            body.sha = sha;
        }

        const response = await fetch(this.getDataFileURL(), {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${pat}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Andmete salvestamine ebaõnnestus');
        }

        const result = await response.json();
        return result.content.sha;
    }
};

/**
 * Encryption module using Web Crypto API
 * AES-GCM encryption with PBKDF2 key derivation
 */
const CryptoModule = {
    SALT_LENGTH: 16,
    IV_LENGTH: 12,
    ITERATIONS: 100000,

    /**
     * Derive a cryptographic key from password
     */
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Encrypt data with password
     */
    async encrypt(data, password) {
        const encoder = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
        const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
        const key = await this.deriveKey(password, salt);

        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoder.encode(JSON.stringify(data))
        );

        // Combine salt + iv + encrypted data
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);

        // Convert to base64
        return btoa(String.fromCharCode(...combined));
    },

    /**
     * Decrypt data with password
     */
    async decrypt(encryptedBase64, password) {
        try {
            // Decode base64
            const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

            // Extract salt, iv, and encrypted data
            const salt = combined.slice(0, this.SALT_LENGTH);
            const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
            const encrypted = combined.slice(this.SALT_LENGTH + this.IV_LENGTH);

            const key = await this.deriveKey(password, salt);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            if (error.name === 'OperationError') {
                throw new Error('Vale parool');
            }
            throw error;
        }
    },

    /**
     * Validate password meets minimum requirements
     */
    validatePassword(password) {
        if (!password || password.length < 8) {
            return { valid: false, message: 'Parool peab olema vähemalt 8 tähemärki pikk' };
        }
        return { valid: true };
    }
};

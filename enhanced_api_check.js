/**
 * Enhanced API compatibility check for SillyTavern plugins
 * Focuses on essential APIs while gracefully handling optional ones
 */
function checkSillyTavernCompatibility() {
    debug('Checking SillyTavern compatibility...');

    // Check if we're in browser environment
    if (typeof window === 'undefined') {
        throw new Error('Browser environment not detected');
    }

    // Enhanced API check - prioritize essential APIs
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    return new Promise((resolve, reject) => {
        const checkAPIs = () => {
            attempts++;
            
            // Essential API check (your fix)
            const hasEssentialAPIs = typeof extensionSettings !== 'undefined';
            
            // Optional API availability (for logging)
            const hasOptionalAPIs = typeof saveSettingsDebounced !== 'undefined';
            
            if (hasEssentialAPIs) {
                debug('Essential SillyTavern APIs found');
                if (hasOptionalAPIs) {
                    debug('Optional APIs also available');
                } else {
                    debug('Note: saveSettingsDebounced not yet available (will use graceful fallback)');
                }
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                reject new Error('Essential SillyTavern APIs not available after waiting');
                return;
            }
            
            debug(`Waiting for SillyTavern APIs... (attempt ${attempts}/${maxAttempts})`);
            setTimeout(checkAPIs, 100);
        };
        
        checkAPIs();
    });
}

/**
 * Safe settings save utility with fallback
 */
function saveSettingsSafely() {
    if (typeof saveSettingsDebounced !== 'undefined') {
        saveSettingsDebounced();
        debug('Settings saved via saveSettingsDebounced');
    } else {
        debug('saveSettingsDebounced not available, settings stored in memory');
        // Could implement manual persistence here if needed
    }
}

/**
 * Enhanced StorageUtils with better error handling
 */
const StorageUtils = {
    /**
     * Set data in extensionSettings with enhanced error handling
     */
    set(key, value) {
        if (typeof extensionSettings === 'undefined') {
            console.warn('[Threadshift] extensionSettings not available, cannot save:', key);
            return false;
        }
        
        if (!extensionSettings[STORAGE_NAMESPACE]) {
            extensionSettings[STORAGE_NAMESPACE] = {};
        }
        
        extensionSettings[STORAGE_NAMESPACE][key] = value;
        
        // Use safe save function
        saveSettingsSafely();
        
        return true;
    },
    
    // ... rest of your StorageUtils methods
};
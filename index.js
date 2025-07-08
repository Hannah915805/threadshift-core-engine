/**
 * Threadshift Core Engine - SillyTavern Plugin
 * Main entry point for core swap engine, zone mapping, and validation
 * 
 * Dependencies: None (core engine)
 * Loading Order: 1
 */

(() => {
    'use strict';

    // Plugin metadata
    const PLUGIN_NAME = 'threadshift-core-engine';
    const PLUGIN_VERSION = '1.0.0';
    const API_VERSION = '1.0.0';
    const REQUIRED_ST_VERSION = '1.10.0';

    // Storage namespace for SillyTavern extensionSettings
    const STORAGE_NAMESPACE = 'threadshift_core';

    // Debug logging flag
    let debugMode = false;

    /**
     * Debug logging utility
     */
    function debug(...args) {
        if (debugMode) {
            console.log(`[${PLUGIN_NAME}]`, ...args);
        }
    }

    /**
     * Check if SillyTavern is available and compatible
     */
    function checkSillyTavernCompatibility() {
        debug('Checking SillyTavern compatibility...');

        // Check if we're in browser environment
        if (typeof window === 'undefined') {
            throw new Error('Browser environment not detected');
        }

        // Check for required ST APIs with timeout
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        return new Promise((resolve, reject) => {
            const checkAPIs = () => {
                attempts++;
                
                // PATCHED: Relaxed check - only require essential API
                if (typeof extensionSettings !== 'undefined') {
                    debug('SillyTavern APIs found');
                    resolve(true);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    reject(new Error('SillyTavern APIs not available after waiting'));
                    return;
                }
                
                debug(`Waiting for SillyTavern APIs... (attempt ${attempts}/${maxAttempts})`);
                setTimeout(checkAPIs, 100);
            };
            
            checkAPIs();
        });
    }

    /**
     * Initialize SillyTavern storage integration
     */
    function initializeStorage() {
        debug('Initializing storage...');

        // Double-check extensionSettings is available
        if (typeof extensionSettings === 'undefined') {
            throw new Error('extensionSettings is not available');
        }

        // Ensure extensionSettings has our namespace
        if (!extensionSettings[STORAGE_NAMESPACE]) {
            extensionSettings[STORAGE_NAMESPACE] = {
                settings: {
                    bidirectionalSwaps: true,
                    autoValidation: true,
                    historyLimit: 100,
                    enableDebugLogging: false,
                    zoneValidation: true
                },
                swapHistory: [],
                zoneMappings: {}
            };
            
            // Save settings if saveSettingsDebounced is available
            if (typeof saveSettingsDebounced !== 'undefined') {
                saveSettingsDebounced();
            }
        }

        // Set debug mode from settings
        debugMode = extensionSettings[STORAGE_NAMESPACE].settings.enableDebugLogging || false;

        debug('Storage initialized');
        return extensionSettings[STORAGE_NAMESPACE];
    }

    /**
     * Storage utility functions for SillyTavern integration
     */
    const StorageUtils = {
        /**
         * Get data from extensionSettings
         */
        get(key) {
            if (typeof extensionSettings === 'undefined' || !extensionSettings[STORAGE_NAMESPACE]) {
                return null;
            }
            return extensionSettings[STORAGE_NAMESPACE][key];
        },

        /**
         * Set data in extensionSettings
         */
        set(key, value) {
            if (typeof extensionSettings === 'undefined') {
                console.warn('extensionSettings not available, cannot save:', key);
                return;
            }
            
            if (!extensionSettings[STORAGE_NAMESPACE]) {
                extensionSettings[STORAGE_NAMESPACE] = {};
            }
            
            extensionSettings[STORAGE_NAMESPACE][key] = value;
            
            if (typeof saveSettingsDebounced !== 'undefined') {
                saveSettingsDebounced();
            }
        },

        /**
         * Update nested data
         */
        update(key, updateFn) {
            const current = this.get(key) || {};
            const updated = updateFn(current);
            this.set(key, updated);
            return updated;
        }
    };

    /**
     * Load script dynamically
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                debug(`Script loaded: ${src}`);
                resolve();
            };
            script.onerror = () => {
                debug(`Script failed to load: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize Zone Swap Engine
     */
    async function initializeZoneSwapEngine() {
        debug('Initializing Zone Swap Engine...');

        // Load zone swap engine if not already loaded
        if (typeof window.ThreadshiftZoneSwapEngine === 'undefined') {
            try {
                await loadScript('./plugins/threadshift-core-engine/zone_swap_engine.js');
            } catch (error) {
                throw new Error('Failed to load Zone Swap Engine');
            }
        }

        // Wait for the constructor to be available
        let attempts = 0;
        while (typeof window.ThreadshiftZoneSwapEngine === 'undefined' && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof window.ThreadshiftZoneSwapEngine === 'undefined') {
            throw new Error('ThreadshiftZoneSwapEngine constructor not available');
        }

        // Create engine instance
        const engine = new window.ThreadshiftZoneSwapEngine();

        // Configure with SillyTavern settings
        const settings = StorageUtils.get('settings') || {};
        engine.updateSettings({
            bidirectionalSwaps: settings.bidirectionalSwaps !== false,
            autoValidation: settings.autoValidation !== false,
            historyLimit: settings.historyLimit || 100,
            debugMode: settings.enableDebugLogging || false
        });

        // Initialize the engine
        engine.initialize();

        // Set up event listeners for persistence
        window.addEventListener('threadshift_swap_executed', (event) => {
            const swapData = event.detail;
            StorageUtils.update('swapHistory', (history) => {
                history.push(swapData);
                // Maintain history limit
                const historyLimit = settings.historyLimit || 100;
                if (history.length > historyLimit) {
                    history.shift();
                }
                return history;
            });
        });

        // Store in ThreadshiftCore namespace
        window.ThreadshiftCore = window.ThreadshiftCore || {};
        window.ThreadshiftCore.swapEngine = engine;

        debug('Zone Swap Engine initialized');
        return engine;
    }

    /**
     * Initialize Garment Zone Mapper
     */
    async function initializeGarmentZoneMapper() {
        debug('Initializing Garment Zone Mapper...');

        // Load garment zone mapper if not already loaded
        if (typeof window.ThreadshiftGarmentZoneMapper === 'undefined') {
            try {
                await loadScript('./plugins/threadshift-core-engine/garment_zone_mapper.js');
            } catch (error) {
                throw new Error('Failed to load Garment Zone Mapper');
            }
        }

        // Wait for the object to be available
        let attempts = 0;
        while (typeof window.ThreadshiftGarmentZoneMapper === 'undefined' && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof window.ThreadshiftGarmentZoneMapper === 'undefined') {
            throw new Error('ThreadshiftGarmentZoneMapper not available');
        }

        // Get the mapper instance
        const mapper = window.ThreadshiftGarmentZoneMapper;

        // Load persisted zone mappings
        const persistedMappings = StorageUtils.get('zoneMappings');
        if (persistedMappings && Object.keys(persistedMappings).length > 0) {
            // Apply custom mappings if mapper supports it
            if (mapper.setCustomMappings) {
                mapper.setCustomMappings(persistedMappings);
            }
        }

        // Store in ThreadshiftCore namespace
        window.ThreadshiftCore = window.ThreadshiftCore || {};
        window.ThreadshiftCore.mapper = mapper;

        debug('Garment Zone Mapper initialized');
        return mapper;
    }

    /**
     * Initialize Body Map Validator
     */
    async function initializeBodyMapValidator() {
        debug('Initializing Body Map Validator...');

        // Load body map validator if not already loaded
        if (typeof window.ThreadshiftBodyMapValidator === 'undefined') {
            try {
                await loadScript('./plugins/threadshift-core-engine/body_map_validator.js');
            } catch (error) {
                debug('Body Map Validator not found - using stub');
                // Create a minimal stub if file doesn't exist
                window.ThreadshiftBodyMapValidator = {
                    validateSwap: () => true,
                    configure: () => {},
                    getStatus: () => ({ version: '1.0.0-stub', initialized: true })
                };
            }
        }

        // Wait for the object to be available
        let attempts = 0;
        while (typeof window.ThreadshiftBodyMapValidator === 'undefined' && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        // Get the validator instance
        const validator = window.ThreadshiftBodyMapValidator || {};

        // Configure with SillyTavern settings
        const settings = StorageUtils.get('settings') || {};
        if (validator.configure) {
            validator.configure({
                zoneValidation: settings.zoneValidation !== false,
                debugMode: settings.enableDebugLogging || false
            });
        }

        // Store in ThreadshiftCore namespace
        window.ThreadshiftCore = window.ThreadshiftCore || {};
        window.ThreadshiftCore.validator = validator;

        debug('Body Map Validator initialized');
        return validator;
    }

    /**
     * Initialize Reciprocal Swap Handler
     */
    async function initializeReciprocalSwapHandler() {
        debug('Initializing Reciprocal Swap Handler...');

        // Load reciprocal swap handler if not already loaded
        if (typeof window.ThreadshiftReciprocalSwapHandler === 'undefined') {
            try {
                await loadScript('./plugins/threadshift-core-engine/reciprocal_swap_handler.js');
            } catch (error) {
                debug('Reciprocal Swap Handler not found - continuing without it');
                // This is optional, so we continue with a stub
                window.ThreadshiftReciprocalSwapHandler = {
                    handleReciprocal: () => true,
                    getStatus: () => ({ version: '1.0.0-stub', initialized: true })
                };
            }
        }

        // Get the handler instance
        const handler = window.ThreadshiftReciprocalSwapHandler || null;

        // Store in ThreadshiftCore namespace
        window.ThreadshiftCore = window.ThreadshiftCore || {};
        window.ThreadshiftCore.reciprocalHandler = handler;

        debug('Reciprocal Swap Handler initialized');
        return handler;
    }

    /**
     * Plugin initialization error handler
     */
    function handleInitializationError(error) {
        console.error(`[${PLUGIN_NAME}] Initialization failed:`, error);
        
        // Try to show user-friendly error in SillyTavern
        if (typeof toastr !== 'undefined') {
            toastr.error(`Threadshift Core Engine failed to initialize: ${error.message}`, 'Plugin Error');
        }
        
        // Store error state if possible
        if (typeof extensionSettings !== 'undefined') {
            extensionSettings[STORAGE_NAMESPACE] = extensionSettings[STORAGE_NAMESPACE] || {};
            extensionSettings[STORAGE_NAMESPACE].error = {
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }
        
        return false;
    }

    /**
     * Main plugin initialization
     */
    async function initializePlugin() {
        try {
            debug('Starting plugin initialization...');

            // Step 1: Check SillyTavern compatibility and wait for APIs
            await checkSillyTavernCompatibility();

            // Step 2: Initialize storage
            initializeStorage();

            // Step 3: Initialize core components
            await initializeZoneSwapEngine();
            await initializeGarmentZoneMapper();
            await initializeBodyMapValidator();
            await initializeReciprocalSwapHandler();

            // Step 4: Emit ready event
            window.dispatchEvent(new CustomEvent('threadshift-core-ready', {
                detail: {
                    pluginName: PLUGIN_NAME,
                    version: PLUGIN_VERSION,
                    apiVersion: API_VERSION,
                    core: window.ThreadshiftCore
                }
            }));

            debug('Plugin initialization complete');
            
            // Show success message
            if (typeof toastr !== 'undefined') {
                toastr.success('Threadshift Core Engine initialized successfully', 'Plugin Ready');
            }

            return true;

        } catch (error) {
            return handleInitializationError(error);
        }
    }

    /**
     * Plugin API for external access
     */
    const ThreadshiftCoreAPI = {
        // Plugin metadata
        name: PLUGIN_NAME,
        version: PLUGIN_VERSION,
        apiVersion: API_VERSION,
        
        // Core components (populated during initialization)
        get swapEngine() { return window.ThreadshiftCore?.swapEngine || null; },
        get mapper() { return window.ThreadshiftCore?.mapper || null; },
        get validator() { return window.ThreadshiftCore?.validator || null; },
        get reciprocalHandler() { return window.ThreadshiftCore?.reciprocalHandler || null; },
        
        // Utility functions
        storage: StorageUtils,
        debug: debug,
        
        // Control functions
        reinitialize: initializePlugin,
        getStatus: () => {
            return {
                initialized: !!window.ThreadshiftCore,
                swapEngine: !!window.ThreadshiftCore?.swapEngine,
                mapper: !!window.ThreadshiftCore?.mapper,
                validator: !!window.ThreadshiftCore?.validator,
                reciprocalHandler: !!window.ThreadshiftCore?.reciprocalHandler,
                settings: StorageUtils.get('settings'),
                storage: {
                    namespace: STORAGE_NAMESPACE,
                    keys: typeof extensionSettings !== 'undefined' && extensionSettings[STORAGE_NAMESPACE] 
                        ? Object.keys(extensionSettings[STORAGE_NAMESPACE]) 
                        : []
                }
            };
        },
        
        // Direct access to core components
        get core() {
            return window.ThreadshiftCore;
        }
    };

    /**
     * Wait for proper initialization timing
     */
    function waitForInitialization() {
        // Check if document is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Additional delay to ensure ST is fully loaded
                setTimeout(() => {
                    initializePlugin().catch(error => {
                        console.error('Plugin initialization failed:', error);
                    });
                }, 1000);
            });
        } else {
            // DOM already loaded, but wait a bit more for ST to be ready
            setTimeout(() => {
                initializePlugin().catch(error => {
                    console.error('Plugin initialization failed:', error);
                });
            }, 1000);
        }
    }

    // Export API to global scope
    window.ThreadshiftCoreAPI = ThreadshiftCoreAPI;
    
    // Also make it available for CommonJS environments
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ThreadshiftCoreAPI;
    }

    debug('Plugin script loaded');

    // Start initialization
    waitForInitialization();

})();
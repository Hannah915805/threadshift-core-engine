// zone_swap_engine.js - Fixed for browser loading
console.log('Loading ThreadshiftZoneSwapEngine...');

// Constructor function
function ThreadshiftZoneSwapEngine() {
    console.log('ThreadshiftZoneSwapEngine constructor called');
    this.activeSwaps = {};
    this.swapHistory = [];
    this.initialized = false;
    this.version = '1.0.0';
    this.settings = {
        bidirectionalSwaps: true,
        autoValidation: true,
        historyLimit: 100,
        debugMode: false
    };
}

// Initialize the engine
ThreadshiftZoneSwapEngine.prototype.initialize = function() {
    if (this.initialized) {
        console.log('ThreadshiftZoneSwapEngine already initialized');
        return true;
    }
    
    console.log('Initializing ThreadshiftZoneSwapEngine...');
    
    // Check for dependencies
    this.zoneMapper = window.ThreadshiftGarmentZoneMapper || null;
    this.validator = window.ThreadshiftBodyMapValidator || null;
    this.reciprocalHandler = window.ThreadshiftReciprocalSwapHandler || null;
    
    if (this.settings.debugMode) {
        console.log('Dependencies check:');
        console.log('- Zone Mapper:', !!this.zoneMapper);
        console.log('- Validator:', !!this.validator);
        console.log('- Reciprocal Handler:', !!this.reciprocalHandler);
    }
    
    this.initialized = true;
    console.log('ThreadshiftZoneSwapEngine initialized successfully');
    return true;
};

// Main swap execution method
ThreadshiftZoneSwapEngine.prototype.performSwap = function(sourceChar, targetChar, garmentId) {
    if (!this.initialized) {
        this.initialize();
    }
    
    if (this.settings.debugMode) {
        console.log('performSwap called:', { sourceChar, targetChar, garmentId });
    }
    
    try {
        // Get garment information
        var garment = this.getGarmentById(garmentId);
        if (!garment) {
            console.error('Garment not found:', garmentId);
            return false;
        }
        
        // Get affected zones
        var zones = this.getZonesForGarment(garment.type);
        if (!zones || zones.length === 0) {
            console.error('No zones found for garment type:', garment.type);
            return false;
        }
        
        // Validate swap if validator is available
        if (this.settings.autoValidation && this.validator) {
            if (!this.validator.validateSwap(sourceChar, targetChar, zones)) {
                console.error('Swap validation failed');
                return false;
            }
        }
        
        // Execute the swap
        var swapId = this.executeSwap(sourceChar, targetChar, zones, garment);
        
        // Handle reciprocal swap if enabled
        if (this.settings.bidirectionalSwaps && this.reciprocalHandler && swapId) {
            this.reciprocalHandler.handleReciprocal(sourceChar, targetChar, zones, garmentId);
        }
        
        return swapId;
        
    } catch (error) {
        console.error('Error in performSwap:', error);
        return false;
    }
};

// Execute the actual swap
ThreadshiftZoneSwapEngine.prototype.executeSwap = function(sourceChar, targetChar, zones, garment) {
    var swapId = this.generateSwapId();
    var timestamp = Date.now();
    
    var swapData = {
        id: swapId,
        source: sourceChar,
        target: targetChar,
        zones: zones,
        garment: garment,
        timestamp: timestamp,
        status: 'active'
    };
    
    // Store the swap
    this.activeSwaps[swapId] = swapData;
    this.addToHistory(swapData);
    
    // Apply zone changes
    for (var i = 0; i < zones.length; i++) {
        this.applyZoneSwap(sourceChar, targetChar, zones[i], swapId);
    }
    
    // Trigger event for other systems
    this.triggerSwapEvent(swapData);
    
    if (this.settings.debugMode) {
        console.log('Swap executed successfully:', swapId);
    }
    
    return swapId;
};

// Apply individual zone swap
ThreadshiftZoneSwapEngine.prototype.applyZoneSwap = function(sourceChar, targetChar, zone, swapId) {
    if (this.settings.debugMode) {
        console.log('Applying zone swap:', { sourceChar, targetChar, zone, swapId });
    }
    
    // This is where you'd integrate with SillyTavern's character system
    // For now, we log and trigger events
    
    // Store zone-specific data
    var zoneSwapData = {
        swapId: swapId,
        source: sourceChar,
        target: targetChar,
        zone: zone,
        timestamp: Date.now()
    };
    
    // Trigger zone-specific event
    this.triggerZoneSwapEvent(zoneSwapData);
};

// Reverse a swap
ThreadshiftZoneSwapEngine.prototype.reverseSwap = function(swapId) {
    var swapData = this.activeSwaps[swapId];
    if (!swapData) {
        console.error('Swap not found:', swapId);
        return false;
    }
    
    // Reverse the zone changes
    for (var i = 0; i < swapData.zones.length; i++) {
        this.applyZoneSwap(swapData.target, swapData.source, swapData.zones[i], swapId);
    }
    
    // Update status
    swapData.status = 'reversed';
    swapData.reversedAt = Date.now();
    
    // Remove from active swaps
    delete this.activeSwaps[swapId];
    
    console.log('Swap reversed:', swapId);
    return true;
};

// Get garment by ID
ThreadshiftZoneSwapEngine.prototype.getGarmentById = function(garmentId) {
    // Parse the garment ID format: CHARACTERID.TYPEINDEX
    var parts = garmentId.split('.');
    if (parts.length !== 2) {
        console.error('Invalid garment ID format:', garmentId);
        return null;
    }
    
    var charId = parts[0];
    var typeIndex = parts[1];
    var typeGroup = typeIndex.substring(0, 2);
    
    // Map type groups to garment types
    var garmentTypes = {
        '01': 'panties',
        '02': 'bra',
        '03': 'pants',
        '04': 'shirt',
        '05': 'jacket',
        '06': 'gloves',
        '07': 'socks',
        '08': 'hat',
        '09': 'dress'
    };
    
    var garmentType = garmentTypes[typeGroup] || 'unknown';
    
    return {
        id: garmentId,
        type: garmentType,
        owner: 'char_' + charId,
        typeGroup: typeGroup,
        sequence: typeIndex.substring(2)
    };
};

// Get zones for garment type
ThreadshiftZoneSwapEngine.prototype.getZonesForGarment = function(garmentType) {
    // Use zone mapper if available
    if (this.zoneMapper && this.zoneMapper.getZonesForGarment) {
        return this.zoneMapper.getZonesForGarment(garmentType);
    }
    
    // Built-in zone mapping
    var zoneMap = {
        'bra': ['chest'],
        'panties': ['genitals'],
        'dress': ['chest', 'waist', 'hips'],
        'shirt': ['chest'],
        'pants': ['waist', 'hips', 'legs'],
        'jacket': ['chest', 'waist'],
        'gloves': ['hands'],
        'socks': ['feet'],
        'hat': ['hair'],
        'wetsuit': ['chest', 'waist', 'hips', 'legs', 'hands', 'feet'],
        'unknown': []
    };
    
    return zoneMap[garmentType] || [];
};

// Generate unique swap ID
ThreadshiftZoneSwapEngine.prototype.generateSwapId = function() {
    return 'swap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Add to history with limit management
ThreadshiftZoneSwapEngine.prototype.addToHistory = function(swapData) {
    this.swapHistory.push(swapData);
    
    // Maintain history limit
    if (this.swapHistory.length > this.settings.historyLimit) {
        this.swapHistory.shift();
    }
};

// Trigger swap event
ThreadshiftZoneSwapEngine.prototype.triggerSwapEvent = function(swapData) {
    if (typeof window !== 'undefined' && window.CustomEvent) {
        var event = new CustomEvent('threadshift_swap_executed', {
            detail: swapData
        });
        window.dispatchEvent(event);
    }
};

// Trigger zone-specific event
ThreadshiftZoneSwapEngine.prototype.triggerZoneSwapEvent = function(zoneSwapData) {
    if (typeof window !== 'undefined' && window.CustomEvent) {
        var event = new CustomEvent('threadshift_zone_swap', {
            detail: zoneSwapData
        });
        window.dispatchEvent(event);
    }
};

// Get active swaps
ThreadshiftZoneSwapEngine.prototype.getActiveSwaps = function() {
    var swaps = [];
    for (var id in this.activeSwaps) {
        swaps.push(this.activeSwaps[id]);
    }
    return swaps;
};

// Get swap history
ThreadshiftZoneSwapEngine.prototype.getSwapHistory = function() {
    return this.swapHistory.slice(); // Return copy
};

// Clear history
ThreadshiftZoneSwapEngine.prototype.clearHistory = function() {
    this.swapHistory = [];
    console.log('Swap history cleared');
};

// Update settings
ThreadshiftZoneSwapEngine.prototype.updateSettings = function(newSettings) {
    for (var key in newSettings) {
        if (this.settings.hasOwnProperty(key)) {
            this.settings[key] = newSettings[key];
        }
    }
    console.log('Settings updated:', this.settings);
};

// Test method
ThreadshiftZoneSwapEngine.prototype.test = function() {
    return 'ThreadshiftZoneSwapEngine v' + this.version + ' is working!';
};

// Get status
ThreadshiftZoneSwapEngine.prototype.getStatus = function() {
    return {
        version: this.version,
        initialized: this.initialized,
        activeSwaps: Object.keys(this.activeSwaps).length,
        historyCount: this.swapHistory.length,
        settings: this.settings,
        dependencies: {
            zoneMapper: !!this.zoneMapper,
            validator: !!this.validator,
            reciprocalHandler: !!this.reciprocalHandler
        }
    };
};

// Shutdown method
ThreadshiftZoneSwapEngine.prototype.shutdown = function() {
    this.activeSwaps = {};
    this.swapHistory = [];
    this.initialized = false;
    console.log('ThreadshiftZoneSwapEngine shutdown complete');
};

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.ThreadshiftZoneSwapEngine = ThreadshiftZoneSwapEngine;
}

// CommonJS support if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThreadshiftZoneSwapEngine;
}

console.log('ThreadshiftZoneSwapEngine loaded successfully');
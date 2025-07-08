/**
 * Threadshift Reciprocal Swap Handler
 * Part of Plugin 1: Threadshift Core Engine
 * Handles bi-directional swapping between two characters based on garments worn
 */

// ===== Setup and Imports =====
import { getSwappableZonesFromGarments } from "./st_swap_engine.mjs";
import { validateBodyMap } from "./body_map_validator.mjs";

// Import the core zone swap engine if available
let ThreadshiftZoneSwapEngine;
try {
    // Try to import the core engine
    const coreModule = await import("./threadshift_core.mjs");
    ThreadshiftZoneSwapEngine = coreModule.default || coreModule.ThreadshiftZoneSwapEngine;
} catch (error) {
    console.warn("Threadshift Core Engine not available, using fallback methods");
}

/**
 * Enhanced deep copy utility that handles special cases
 * Falls back to core engine's deepCopy if available, otherwise uses JSON method
 * @param {*} obj - Object to deep copy
 * @returns {*} Deep copied object
 */
function deepCopy(obj) {
    if (ThreadshiftZoneSwapEngine && typeof ThreadshiftZoneSwapEngine.prototype.deepCopy === 'function') {
        const engine = new ThreadshiftZoneSwapEngine();
        return engine.deepCopy(obj);
    }
    
    // Fallback to JSON method (less robust but functional)
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepCopy(item));
    }
    
    if (typeof obj === 'object') {
        const copy = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = deepCopy(obj[key]);
            }
        }
        return copy;
    }
    
    return obj;
}

/**
 * Validates if a zone is valid for swapping
 * Uses core engine validation if available, otherwise basic check
 * @param {string} zoneName - Zone to validate
 * @returns {boolean} True if zone is valid
 */
function isValidZone(zoneName) {
    if (ThreadshiftZoneSwapEngine) {
        const engine = new ThreadshiftZoneSwapEngine();
        return engine.isValidZone(zoneName);
    }
    
    // Fallback validation - basic zone list
    const validZones = ['hair', 'face', 'neck', 'chest', 'waist', 'hips', 'genitals', 'hands', 'legs', 'feet'];
    return validZones.includes(zoneName?.toLowerCase()?.trim());
}

/**
 * Performs reciprocal swapping between two characters based on garments worn
 * Enhanced version that integrates with the core zone swap engine when available
 * @param {Object} charA - First character's body map
 * @param {Object} charB - Second character's body map
 * @param {Array} garmentsWorn - Array of garments that determine which zones to swap
 * @returns {Object} Result object with updated characters and swap details
 */
function reciprocalSwap(charA, charB, garmentsWorn = []) {
    // Validate inputs
    if (!charA || typeof charA !== 'object') {
        throw new Error("Character A must be a valid object");
    }
    
    if (!charB || typeof charB !== 'object') {
        throw new Error("Character B must be a valid object");
    }
    
    if (!Array.isArray(garmentsWorn)) {
        throw new Error("Garments worn must be an array");
    }
    
    // Validate body maps
    if (!validateBodyMap(charA) || !validateBodyMap(charB)) {
        throw new Error("Invalid body map(s)");
    }
    
    // Get zones to swap based on garments
    const zones = getSwappableZonesFromGarments(garmentsWorn);
    
    // Filter to only valid zones
    const validZones = zones.filter(zone => isValidZone(zone));
    
    if (validZones.length === 0) {
        return {
            success: true,
            updatedA: deepCopy(charA),
            updatedB: deepCopy(charB),
            zonesSwapped: [],
            message: "No valid zones to swap"
        };
    }
    
    // If core engine is available, use it for individual zone swaps
    if (ThreadshiftZoneSwapEngine) {
        return reciprocalSwapWithEngine(charA, charB, validZones);
    } else {
        return reciprocalSwapFallback(charA, charB, validZones);
    }
}

/**
 * Enhanced reciprocal swap using the core zone swap engine
 * @param {Object} charA - First character's body map
 * @param {Object} charB - Second character's body map
 * @param {Array} validZones - Array of valid zones to swap
 * @returns {Object} Result object with detailed swap information
 */
function reciprocalSwapWithEngine(charA, charB, validZones) {
    const engine = new ThreadshiftZoneSwapEngine();
    let currentA = deepCopy(charA);
    let currentB = deepCopy(charB);
    const swapResults = [];
    const errors = [];
    
    // Perform swaps zone by zone using the core engine
    for (const zone of validZones) {
        try {
            const result = engine.swapZone(zone, currentA, currentB);
            
            if (result.success) {
                currentA = result.userBody;
                currentB = result.sourceBody;
                swapResults.push({
                    zone: zone,
                    success: true,
                    swapDetails: result.swapDetails
                });
            } else {
                errors.push({
                    zone: zone,
                    error: result.error
                });
            }
        } catch (error) {
            errors.push({
                zone: zone,
                error: error.message
            });
        }
    }
    
    return {
        success: errors.length === 0,
        updatedA: currentA,
        updatedB: currentB,
        zonesSwapped: swapResults.filter(r => r.success).map(r => r.zone),
        swapDetails: swapResults,
        errors: errors.length > 0 ? errors : undefined,
        message: errors.length > 0 
            ? `Completed with ${errors.length} errors out of ${validZones.length} zones`
            : `Successfully swapped ${swapResults.length} zones`
    };
}

/**
 * Fallback reciprocal swap implementation when core engine is not available
 * @param {Object} charA - First character's body map
 * @param {Object} charB - Second character's body map
 * @param {Array} validZones - Array of valid zones to swap
 * @returns {Object} Result object with swap information
 */
function reciprocalSwapFallback(charA, charB, validZones) {
    const swappedA = deepCopy(charA);
    const swappedB = deepCopy(charB);
    const actuallySwapped = [];
    
    for (const zone of validZones) {
        // Only swap if both characters have the zone
        if (charA[zone] && charB[zone]) {
            swappedA[zone] = deepCopy(charB[zone]);
            swappedB[zone] = deepCopy(charA[zone]);
            actuallySwapped.push(zone);
        }
    }
    
    return {
        success: true,
        updatedA: swappedA,
        updatedB: swappedB,
        zonesSwapped: actuallySwapped,
        message: `Successfully swapped ${actuallySwapped.length} zones using fallback method`
    };
}

/**
 * Batch reciprocal swap - handles multiple character pairs at once
 * @param {Array} characterPairs - Array of {charA, charB, garmentsWorn} objects
 * @returns {Array} Array of swap results
 */
function batchReciprocalSwap(characterPairs) {
    if (!Array.isArray(characterPairs)) {
        throw new Error("Character pairs must be an array");
    }
    
    const results = [];
    
    for (let i = 0; i < characterPairs.length; i++) {
        const pair = characterPairs[i];
        
        try {
            if (!pair || typeof pair !== 'object') {
                throw new Error(`Pair ${i} must be an object`);
            }
            
            if (!pair.charA || !pair.charB) {
                throw new Error(`Pair ${i} must have charA and charB properties`);
            }
            
            const result = reciprocalSwap(pair.charA, pair.charB, pair.garmentsWorn || []);
            results.push({
                pairIndex: i,
                ...result
            });
        } catch (error) {
            results.push({
                pairIndex: i,
                success: false,
                error: error.message,
                updatedA: pair.charA,
                updatedB: pair.charB,
                zonesSwapped: []
            });
        }
    }
    
    return results;
}

/**
 * Preview reciprocal swap without actually performing it
 * @param {Object} charA - First character's body map
 * @param {Object} charB - Second character's body map
 * @param {Array} garmentsWorn - Array of garments that determine which zones to swap
 * @returns {Object} Preview information about what would be swapped
 */
function previewReciprocalSwap(charA, charB, garmentsWorn = []) {
    try {
        // Validate inputs
        if (!validateBodyMap(charA) || !validateBodyMap(charB)) {
            throw new Error("Invalid body map(s)");
        }
        
        const zones = getSwappableZonesFromGarments(garmentsWorn);
        const validZones = zones.filter(zone => isValidZone(zone));
        
        // Analyze what would be swapped
        const swapPreview = [];
        
        for (const zone of validZones) {
            if (charA[zone] && charB[zone]) {
                swapPreview.push({
                    zone: zone,
                    charAWillReceive: charB[zone]?.descriptor || 'Unknown',
                    charBWillReceive: charA[zone]?.descriptor || 'Unknown',
                    canSwap: true
                });
            } else if (charA[zone] || charB[zone]) {
                swapPreview.push({
                    zone: zone,
                    charAWillReceive: charB[zone]?.descriptor || 'Nothing (zone missing)',
                    charBWillReceive: charA[zone]?.descriptor || 'Nothing (zone missing)',
                    canSwap: false,
                    warning: 'One character is missing this zone'
                });
            }
        }
        
        return {
            success: true,
            totalZones: validZones.length,
            swappableZones: swapPreview.filter(p => p.canSwap).length,
            preview: swapPreview,
            garments: garmentsWorn
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            totalZones: 0,
            swappableZones: 0,
            preview: []
        };
    }
}

// ===== Export =====
export {
    reciprocalSwap,
    batchReciprocalSwap,
    previewReciprocalSwap
};
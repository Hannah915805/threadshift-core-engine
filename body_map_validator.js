/**
 * Threadshift Body Map Validator
 * Validates character body maps for structural completeness and correctness
 * Called before transformations to ensure body maps are valid and usable
 */

class BodyMapValidator {
    constructor() {
        // Define required top-level zones
        this.requiredZones = new Set([
            'hair', 'face', 'neck', 'chest', 'waist', 'butt', 
            'genitals', 'hands', 'legs', 'feet'
        ]);

        // Define invalid zones that must not appear
        this.invalidZones = new Set([
            'torso', 'height', 'voice', 'head'
        ]);

        // Define required fields for all zones
        this.requiredFields = [
            'descriptor', 'care', 'marks', '_plugin'
        ];

        // Define zones that require muscle tone
        this.muscleZones = new Set([
            'chest', 'waist', 'butt', 'legs', 'arms'
        ]);

        // Define valid mark types
        this.validMarkTypes = new Set([
            'tattoo', 'scar', 'freckles', 'mole', 'birthmark'
        ]);

        // Define valid mark visibility levels
        this.validMarkVisibility = new Set([
            'high', 'medium', 'low'
        ]);

        // Define valid genital sub-objects
        this.validGenitalTypes = new Set([
            'vagina', 'penis', 'anal'
        ]);

        // Define required fields for genital sub-objects
        this.genitalRequiredFields = [
            'descriptor', 'care', 'tone', 'marks'
        ];
    }

    /**
     * Main validation function
     * @param {Object} bodyMap - Body map to validate
     * @returns {Object} Validation result with success status and errors
     */
    validateBodyMap(bodyMap) {
        const errors = [];

        // Check if bodyMap is fundamentally valid
        if (!bodyMap || typeof bodyMap !== 'object' || Array.isArray(bodyMap)) {
            return {
                success: false,
                errors: ['Body map must be a valid object']
            };
        }

        // Check for required zones
        this.validateRequiredZones(bodyMap, errors);

        // Check for invalid zones
        this.validateInvalidZones(bodyMap, errors);

        // Validate each zone structure
        this.validateZoneStructures(bodyMap, errors);

        // Return result
        return {
            success: errors.length === 0,
            ...(errors.length > 0 && { errors })
        };
    }

    /**
     * Validate that all required zones are present
     * @param {Object} bodyMap - Body map to check
     * @param {Array} errors - Array to collect errors
     */
    validateRequiredZones(bodyMap, errors) {
        for (const zone of this.requiredZones) {
            if (!bodyMap.hasOwnProperty(zone)) {
                errors.push(`Missing zone: ${zone}`);
            } else if (!bodyMap[zone] || typeof bodyMap[zone] !== 'object' || Array.isArray(bodyMap[zone])) {
                errors.push(`Zone '${zone}' must be an object`);
            }
        }
    }

    /**
     * Validate that no invalid zones are present
     * @param {Object} bodyMap - Body map to check
     * @param {Array} errors - Array to collect errors
     */
    validateInvalidZones(bodyMap, errors) {
        for (const zone of this.invalidZones) {
            if (bodyMap.hasOwnProperty(zone)) {
                errors.push(`Invalid zone '${zone}' must not be present`);
            }
        }
    }

    /**
     * Validate the structure of each zone
     * @param {Object} bodyMap - Body map to check
     * @param {Array} errors - Array to collect errors
     */
    validateZoneStructures(bodyMap, errors) {
        for (const [zoneName, zoneData] of Object.entries(bodyMap)) {
            // Skip validation for invalid zones (already reported)
            if (this.invalidZones.has(zoneName)) {
                continue;
            }

            // Only validate required zones and any additional valid zones
            if (this.requiredZones.has(zoneName)) {
                if (zoneName === 'genitals') {
                    this.validateGenitalsZone(zoneData, errors);
                } else {
                    this.validateStandardZone(zoneName, zoneData, errors);
                }
            }
        }
    }

    /**
     * Validate a standard zone structure
     * @param {string} zoneName - Name of the zone
     * @param {Object} zoneData - Zone data to validate
     * @param {Array} errors - Array to collect errors
     */
    validateStandardZone(zoneName, zoneData, errors) {
        // Validate required fields
        for (const field of this.requiredFields) {
            if (!zoneData.hasOwnProperty(field)) {
                errors.push(`Missing field '${field}' in zone: ${zoneName}`);
            } else {
                this.validateFieldType(zoneName, field, zoneData[field], errors);
            }
        }

        // Validate muscle tone if required
        if (this.muscleZones.has(zoneName)) {
            if (!zoneData.hasOwnProperty('tone')) {
                errors.push(`Missing required field 'tone' in zone: ${zoneName}`);
            } else if (typeof zoneData.tone !== 'string') {
                errors.push(`Field 'tone' in zone '${zoneName}' must be a string`);
            }
        }

        // Validate marks array
        if (zoneData.hasOwnProperty('marks')) {
            this.validateMarksArray(zoneName, zoneData.marks, errors);
        }

        // Validate _plugin object
        if (zoneData.hasOwnProperty('_plugin')) {
            this.validatePluginObject(zoneName, zoneData._plugin, errors);
        }
    }

    /**
     * Validate the genitals zone structure
     * @param {Object} genitalsData - Genitals zone data
     * @param {Array} errors - Array to collect errors
     */
    validateGenitalsZone(genitalsData, errors) {
        // Check if genitals is a valid object
        if (!genitalsData || typeof genitalsData !== 'object' || Array.isArray(genitalsData)) {
            errors.push("Zone 'genitals' must be an object");
            return;
        }

        // Validate that at least one valid genital type is present
        const presentTypes = Object.keys(genitalsData).filter(key => 
            this.validGenitalTypes.has(key)
        );

        if (presentTypes.length === 0) {
            errors.push("Genitals zone must contain at least one of: vagina, penis, anal");
            return;
        }

        // Validate each present genital type
        for (const type of presentTypes) {
            this.validateGenitalType(type, genitalsData[type], errors);
        }

        // Check for invalid keys in genitals
        for (const key of Object.keys(genitalsData)) {
            if (!this.validGenitalTypes.has(key)) {
                errors.push(`Invalid field '${key}' in genitals zone`);
            }
        }
    }

    /**
     * Validate a specific genital type (vagina, penis, anal)
     * @param {string} type - Type of genital (vagina, penis, anal)
     * @param {Object} data - Genital data to validate
     * @param {Array} errors - Array to collect errors
     */
    validateGenitalType(type, data, errors) {
        const prefix = `genitals.${type}`;

        // Check if data is a valid object
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            errors.push(`${prefix} must be an object`);
            return;
        }

        // Validate required fields
        for (const field of this.genitalRequiredFields) {
            if (!data.hasOwnProperty(field)) {
                errors.push(`Missing field '${field}' in ${prefix}`);
            } else {
                this.validateFieldType(prefix, field, data[field], errors);
            }
        }

        // Validate marks array
        if (data.hasOwnProperty('marks')) {
            this.validateMarksArray(prefix, data.marks, errors);
        }

        // Validate _plugin object
        if (data.hasOwnProperty('_plugin')) {
            this.validatePluginObject(prefix, data._plugin, errors);
        }

        // Validate type-specific optional fields
        if (type === 'vagina') {
            this.validateVaginaSpecificFields(data, errors);
        } else if (type === 'penis') {
            this.validatePenisSpecificFields(data, errors);
        } else if (type === 'anal') {
            this.validateAnalSpecificFields(data, errors);
        }
    }

    /**
     * Validate vagina-specific optional fields
     * @param {Object} data - Vagina data
     * @param {Array} errors - Array to collect errors
     */
    validateVaginaSpecificFields(data, errors) {
        if (data.hasOwnProperty('internal')) {
            if (!data.internal || typeof data.internal !== 'object' || Array.isArray(data.internal)) {
                errors.push("genitals.vagina.internal must be an object");
            } else {
                const internal = data.internal;
                
                // Validate optional numeric fields
                if (internal.hasOwnProperty('depth_inches')) {
                    if (typeof internal.depth_inches !== 'number' || internal.depth_inches < 0) {
                        errors.push("genitals.vagina.internal.depth_inches must be a number >= 0");
                    }
                }

                // Validate optional string fields
                if (internal.hasOwnProperty('tightness_level')) {
                    if (typeof internal.tightness_level !== 'string') {
                        errors.push("genitals.vagina.internal.tightness_level must be a string");
                    }
                }

                if (internal.hasOwnProperty('g_spot_ridge')) {
                    if (typeof internal.g_spot_ridge !== 'string') {
                        errors.push("genitals.vagina.internal.g_spot_ridge must be a string");
                    }
                }

                // Validate optional boolean fields
                if (internal.hasOwnProperty('ridge_presence')) {
                    if (typeof internal.ridge_presence !== 'boolean') {
                        errors.push("genitals.vagina.internal.ridge_presence must be a boolean");
                    }
                }

                if (internal.hasOwnProperty('hymen_intact')) {
                    if (typeof internal.hymen_intact !== 'boolean') {
                        errors.push("genitals.vagina.internal.hymen_intact must be a boolean");
                    }
                }
            }
        }
    }

    /**
     * Validate penis-specific optional fields
     * @param {Object} data - Penis data
     * @param {Array} errors - Array to collect errors
     */
    validatePenisSpecificFields(data, errors) {
        if (data.hasOwnProperty('size')) {
            if (!data.size || typeof data.size !== 'object' || Array.isArray(data.size)) {
                errors.push("genitals.penis.size must be an object");
            } else {
                const size = data.size;
                
                // Validate required numeric fields in size
                const requiredSizeFields = ['length_erect_inches', 'length_flaccid_inches', 'girth_inches'];
                for (const field of requiredSizeFields) {
                    if (size.hasOwnProperty(field)) {
                        if (typeof size[field] !== 'number' || size[field] < 0) {
                            errors.push(`genitals.penis.size.${field} must be a number >= 0`);
                        }
                    }
                }
            }
        }

        if (data.hasOwnProperty('circumcised')) {
            if (typeof data.circumcised !== 'boolean') {
                errors.push("genitals.penis.circumcised must be a boolean");
            }
        }
    }

    /**
     * Validate anal-specific optional fields
     * @param {Object} data - Anal data
     * @param {Array} errors - Array to collect errors
     */
    validateAnalSpecificFields(data, errors) {
        if (data.hasOwnProperty('internal')) {
            if (!data.internal || typeof data.internal !== 'object' || Array.isArray(data.internal)) {
                errors.push("genitals.anal.internal must be an object");
            } else {
                const internal = data.internal;
                
                // Validate optional numeric fields
                if (internal.hasOwnProperty('depth_inches')) {
                    if (typeof internal.depth_inches !== 'number' || internal.depth_inches < 0) {
                        errors.push("genitals.anal.internal.depth_inches must be a number >= 0");
                    }
                }

                // Validate optional string fields
                if (internal.hasOwnProperty('tightness_level')) {
                    if (typeof internal.tightness_level !== 'string') {
                        errors.push("genitals.anal.internal.tightness_level must be a string");
                    }
                }
            }
        }
    }

    /**
     * Validate field types for standard fields
     * @param {string} zoneName - Name of the zone
     * @param {string} fieldName - Name of the field
     * @param {*} value - Value to validate
     * @param {Array} errors - Array to collect errors
     */
    validateFieldType(zoneName, fieldName, value, errors) {
        switch (fieldName) {
            case 'descriptor':
            case 'care':
            case 'tone':
                if (typeof value !== 'string') {
                    errors.push(`Field '${fieldName}' in zone '${zoneName}' must be a string`);
                }
                break;
            case 'marks':
                if (!Array.isArray(value)) {
                    errors.push(`Field '${fieldName}' in zone '${zoneName}' must be an array`);
                }
                break;
            case '_plugin':
                if (!value || typeof value !== 'object' || Array.isArray(value)) {
                    errors.push(`Field '${fieldName}' in zone '${zoneName}' must be an object`);
                }
                break;
        }
    }

    /**
     * Validate marks array structure
     * @param {string} zoneName - Name of the zone
     * @param {Array} marks - Marks array to validate
     * @param {Array} errors - Array to collect errors
     */
    validateMarksArray(zoneName, marks, errors) {
        if (!Array.isArray(marks)) {
            errors.push(`Field 'marks' in zone '${zoneName}' must be an array`);
            return;
        }

        marks.forEach((mark, index) => {
            if (!mark || typeof mark !== 'object' || Array.isArray(mark)) {
                errors.push(`Invalid mark in ${zoneName}[${index}]: must be an object`);
                return;
            }

            // Check required mark fields
            const requiredMarkFields = ['type', 'description', 'location_detail', 'visibility'];
            for (const field of requiredMarkFields) {
                if (!mark.hasOwnProperty(field)) {
                    errors.push(`Invalid mark in ${zoneName}[${index}]: missing '${field}'`);
                } else if (typeof mark[field] !== 'string') {
                    errors.push(`Invalid mark in ${zoneName}[${index}]: '${field}' must be a string`);
                }
            }

            // Validate mark type
            if (mark.hasOwnProperty('type') && !this.validMarkTypes.has(mark.type)) {
                errors.push(`Invalid mark in ${zoneName}[${index}]: type '${mark.type}' must be one of: ${Array.from(this.validMarkTypes).join(', ')}`);
            }

            // Validate mark visibility
            if (mark.hasOwnProperty('visibility') && !this.validMarkVisibility.has(mark.visibility)) {
                errors.push(`Invalid mark in ${zoneName}[${index}]: visibility '${mark.visibility}' must be one of: ${Array.from(this.validMarkVisibility).join(', ')}`);
            }
        });
    }

    /**
     * Validate _plugin object structure
     * @param {string} zoneName - Name of the zone
     * @param {Object} plugin - Plugin object to validate
     * @param {Array} errors - Array to collect errors
     */
    validatePluginObject(zoneName, plugin, errors) {
        if (!plugin || typeof plugin !== 'object' || Array.isArray(plugin)) {
            errors.push(`Field '_plugin' in zone '${zoneName}' must be an object`);
            return;
        }

        // Validate plugin field types
        for (const [key, value] of Object.entries(plugin)) {
            const valueType = typeof value;
            if (valueType !== 'string' && valueType !== 'number' && valueType !== 'boolean') {
                errors.push(`Invalid _plugin value in ${zoneName}: expected string/number/boolean, got ${valueType}`);
            }
        }
    }

    /**
     * Check if a zone name is valid
     * @param {string} zoneName - Zone name to check
     * @returns {boolean} True if zone is valid
     */
    isValidZone(zoneName) {
        if (!zoneName || typeof zoneName !== 'string') {
            return false;
        }
        return this.requiredZones.has(zoneName.toLowerCase().trim());
    }

    /**
     * Check if a zone name is invalid
     * @param {string} zoneName - Zone name to check
     * @returns {boolean} True if zone is invalid
     */
    isInvalidZone(zoneName) {
        if (!zoneName || typeof zoneName !== 'string') {
            return false;
        }
        return this.invalidZones.has(zoneName.toLowerCase().trim());
    }

    /**
     * Get list of required zones
     * @returns {Array} Array of required zone names
     */
    getRequiredZones() {
        return Array.from(this.requiredZones);
    }

    /**
     * Get list of invalid zones
     * @returns {Array} Array of invalid zone names
     */
    getInvalidZones() {
        return Array.from(this.invalidZones);
    }

    /**
     * Get list of zones that require muscle tone
     * @returns {Array} Array of muscle zone names
     */
    getMuscleZones() {
        return Array.from(this.muscleZones);
    }
}

// Export for use in SillyTavern plugin
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BodyMapValidator;
}

// Browser compatibility
if (typeof window !== 'undefined') {
    window.BodyMapValidator = BodyMapValidator;
}

// Example usage and testing
/*
const validator = new BodyMapValidator();

// Example valid body map
const validBodyMap = {
    hair: {
        descriptor: "long brown hair",
        care: "clean and styled",
        marks: [],
        _plugin: { length: "long" }
    },
    face: {
        descriptor: "oval face",
        care: "moisturized",
        marks: [
            {
                type: "freckles",
                description: "light freckles",
                location_detail: "across nose",
                visibility: "medium"
            }
        ],
        _plugin: {}
    },
    neck: {
        descriptor: "slender neck",
        care: "clean",
        marks: [],
        _plugin: {}
    },
    chest: {
        descriptor: "full breasts",
        care: "moisturized",
        tone: "soft",
        marks: [],
        _plugin: { cup_size: "C" }
    },
    waist: {
        descriptor: "narrow waist",
        care: "clean",
        tone: "toned",
        marks: [],
        _plugin: {}
    },
    hips: {
        descriptor: "curvy hips",
        care: "moisturized",
        tone: "soft",
        marks: [],
        _plugin: {}
    },
    genitals: {
        vagina: {
            descriptor: "smooth vagina",
            care: "waxed",
            tone: "sensitive",
            marks: [],
            _plugin: {},
            internal: {
                depth_inches: 4.5,
                tightness_level: "snug",
                ridge_presence: true,
                g_spot_ridge: "pronounced"
            }
        }
    },
    hands: {
        descriptor: "delicate hands",
        care: "manicured",
        marks: [],
        _plugin: {}
    },
    legs: {
        descriptor: "long legs",
        care: "shaved",
        tone: "athletic",
        marks: [],
        _plugin: {}
    },
    feet: {
        descriptor: "small feet",
        care: "pedicured",
        marks: [],
        _plugin: {}
    }
};

// Test validation
const result = validator.validateBodyMap(validBodyMap);
console.log('Validation result:', result);

// Test invalid body map
const invalidBodyMap = {
    hair: {
        descriptor: "brown hair",
        care: "clean"
        // Missing marks and _plugin
    },
    torso: {  // Invalid zone
        descriptor: "muscular torso"
    }
    // Missing most required zones
};

const invalidResult = validator.validateBodyMap(invalidBodyMap);
console.log('Invalid validation result:', invalidResult);
*/
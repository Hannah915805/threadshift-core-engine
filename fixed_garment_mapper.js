// garment_zone_mapper.js - Fixed for browser loading
console.log('Loading ThreadshiftGarmentZoneMapper...');

// Since we can't use ES6 imports in script tags, we'll define the zone enum inline
// or expect it to be loaded separately
const zoneEnum = {
  zoneNumberToName: {
    1: 'head',
    2: 'hair',
    3: 'face',
    4: 'neck',
    5: 'chest',
    6: 'waist',
    7: 'hips',
    8: 'genitals',
    9: 'legs',
    10: 'feet',
    11: 'hands',
    12: 'arms'
  },
  zoneNameToNumber: {
    'head': 1,
    'hair': 2,
    'face': 3,
    'neck': 4,
    'chest': 5,
    'waist': 6,
    'hips': 7,
    'genitals': 8,
    'legs': 9,
    'feet': 10,
    'hands': 11,
    'arms': 12
  }
};

function getZoneNameByNumber(num) {
  return zoneEnum.zoneNumberToName[num];
}

function getZoneNumberByName(name) {
  return zoneEnum.zoneNameToNumber[name];
}

// Garment to zone mapping
function getZonesForGarment(garmentType) {
  const garmentZoneMap = {
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
  
  return garmentZoneMap[garmentType] || [];
}

// Create the mapper object
const ThreadshiftGarmentZoneMapper = {
  zoneEnum: zoneEnum,
  getZoneNameByNumber: getZoneNameByNumber,
  getZoneNumberByName: getZoneNumberByName,
  getZonesForGarment: getZonesForGarment,
  
  // Custom mappings support
  customMappings: {},
  
  setCustomMappings: function(mappings) {
    this.customMappings = mappings || {};
    console.log('Custom zone mappings set:', this.customMappings);
  },
  
  getCustomZonesForGarment: function(garmentType) {
    return this.customMappings[garmentType] || this.getZonesForGarment(garmentType);
  }
};

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.ThreadshiftGarmentZoneMapper = ThreadshiftGarmentZoneMapper;
}

// CommonJS support if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThreadshiftGarmentZoneMapper;
}

console.log('ThreadshiftGarmentZoneMapper loaded successfully');
/**
 * DataValidator.js
 * Comprehensive validation framework with schema support
 * Phase 3 Implementation
 */

class DataValidator {
  constructor() {
    // Validation rules registry
    this.rules = new Map();

    // Custom validators
    this.customValidators = new Map();

    // Schema definitions
    this.schemas = new Map();

    // Validation cache for performance
    this.validationCache = new Map();
    this.cacheMaxSize = 100;

    // Error accumulator
    this.errors = [];

    // Statistics
    this.stats = {
      validations: 0,
      passed: 0,
      failed: 0,
      cacheHits: 0,
    };

    // Initialize built-in validators
    this.initializeValidators();

    // Initialize schemas
    this.initializeSchemas();
  }

  /**
   * Initialize built-in validators
   */
  initializeValidators() {
    // Type validators
    this.addValidator("string", (value) => typeof value === "string");
    this.addValidator(
      "number",
      (value) => typeof value === "number" && !isNaN(value),
    );
    this.addValidator("boolean", (value) => typeof value === "boolean");
    this.addValidator("array", (value) => Array.isArray(value));
    this.addValidator(
      "object",
      (value) =>
        value !== null && typeof value === "object" && !Array.isArray(value),
    );
    this.addValidator("function", (value) => typeof value === "function");
    this.addValidator("null", (value) => value === null);
    this.addValidator("undefined", (value) => value === undefined);

    // Number validators
    this.addValidator("integer", (value) => Number.isInteger(value));
    this.addValidator(
      "positive",
      (value) => typeof value === "number" && value > 0,
    );
    this.addValidator(
      "negative",
      (value) => typeof value === "number" && value < 0,
    );
    this.addValidator(
      "nonNegative",
      (value) => typeof value === "number" && value >= 0,
    );

    // String validators
    this.addValidator("email", (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return typeof value === "string" && emailRegex.test(value);
    });

    this.addValidator("url", (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    });

    this.addValidator("alphanumeric", (value) => {
      const regex = /^[a-zA-Z0-9]+$/;
      return typeof value === "string" && regex.test(value);
    });

    this.addValidator("hex", (value) => {
      const regex = /^[0-9a-fA-F]+$/;
      return typeof value === "string" && regex.test(value);
    });

    // Array validators
    this.addValidator(
      "nonEmptyArray",
      (value) => Array.isArray(value) && value.length > 0,
    );
    this.addValidator("uniqueArray", (value) => {
      if (!Array.isArray(value)) return false;
      return new Set(value).size === value.length;
    });

    // OTTO-specific validators
    this.addValidator("tempo", (value) => {
      return typeof value === "number" && value >= 30 && value <= 300;
    });

    this.addValidator("sliderValue", (value) => {
      return typeof value === "number" && value >= 0 && value <= 100;
    });

    this.addValidator("playerNumber", (value) => {
      return Number.isInteger(value) && value >= 1 && value <= 8;
    });

    this.addValidator("patternName", (value) => {
      const regex = /^[a-zA-Z0-9\-_\s]+$/;
      return (
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= 50 &&
        regex.test(value)
      );
    });

    this.addValidator("presetName", (value) => {
      const regex = /^[a-zA-Z0-9\-_\s()]+$/;
      return (
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= 50 &&
        regex.test(value)
      );
    });

    this.addValidator("kitName", (value) => {
      const regex = /^[a-zA-Z0-9\-_\s]+$/;
      return (
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= 50 &&
        regex.test(value)
      );
    });
  }

  /**
   * Initialize schema definitions
   */
  initializeSchemas() {
    // Player State Schema
    this.addSchema("playerState", {
      presetName: { type: "string", required: true, validator: "presetName" },
      kitName: { type: "string", required: true, validator: "kitName" },
      patternGroup: { type: "string", required: true },
      selectedPattern: {
        type: "string",
        required: true,
        validator: "patternName",
      },
      kitMixerActive: { type: "boolean", required: false, default: false },
      muted: { type: "boolean", required: false, default: false },
      toggleStates: {
        type: "object",
        required: true,
        properties: {
          none: { type: "boolean", required: true },
          auto: { type: "boolean", required: true },
          manual: { type: "boolean", required: true },
          stick: { type: "boolean", required: true },
          ride: { type: "boolean", required: true },
          lock: { type: "boolean", required: true },
        },
        custom: (value) => {
          // Ensure exactly one of none/auto/manual is true
          const radioStates = [value.none, value.auto, value.manual];
          return radioStates.filter((s) => s === true).length === 1;
        },
      },
      fillStates: {
        type: "object",
        required: true,
        properties: {
          now: { type: "boolean", required: true },
          4: { type: "boolean", required: true },
          8: { type: "boolean", required: true },
          16: { type: "boolean", required: true },
          32: { type: "boolean", required: true },
          solo: { type: "boolean", required: true },
        },
        custom: (value) => {
          // Ensure at most one of 4/8/16/32 is true
          const exclusiveFills = [
            value["4"],
            value["8"],
            value["16"],
            value["32"],
          ];
          return exclusiveFills.filter((s) => s === true).length <= 1;
        },
      },
      sliderValues: {
        type: "object",
        required: true,
        properties: {
          swing: { type: "number", required: true, validator: "sliderValue" },
          energy: { type: "number", required: true, validator: "sliderValue" },
          volume: { type: "number", required: true, validator: "sliderValue" },
        },
      },
      linkStates: {
        type: "object",
        required: false,
        properties: {
          swing: { type: "boolean", required: false, default: false },
          energy: { type: "boolean", required: false, default: false },
          volume: { type: "boolean", required: false, default: false },
        },
      },
    });

    // Pattern Group Schema
    this.addSchema("patternGroup", {
      name: { type: "string", required: true, minLength: 1, maxLength: 50 },
      patterns: {
        type: "array",
        required: true,
        length: 16,
        items: { type: "string", validator: "patternName" },
      },
      selectedPattern: {
        type: "string",
        required: true,
        validator: "patternName",
      },
      locked: { type: "boolean", required: false, default: false },
      createdAt: { type: "number", required: false, validator: "positive" },
      modifiedAt: { type: "number", required: false, validator: "positive" },
    });

    // Drumkit Schema
    this.addSchema("drumkit", {
      name: { type: "string", required: true, validator: "kitName" },
      displayName: { type: "string", required: false },
      description: { type: "string", required: false, maxLength: 200 },
      selectedMixerPreset: { type: "string", required: true },
      mixerPresets: {
        type: "object",
        required: true,
        minProperties: 1,
        additionalProperties: {
          type: "object",
          properties: {
            name: { type: "string", required: true },
            levels: { type: "object", required: true },
            panning: { type: "object", required: false },
            effects: { type: "object", required: false },
          },
        },
      },
      metadata: {
        type: "object",
        required: false,
        properties: {
          manufacturer: { type: "string", required: false },
          category: { type: "string", required: false },
          tags: { type: "array", required: false, items: { type: "string" } },
          createdAt: { type: "number", required: false },
          modifiedAt: { type: "number", required: false },
        },
      },
    });

    // Preset Schema
    this.addSchema("preset", {
      name: { type: "string", required: true, validator: "presetName" },
      locked: { type: "boolean", required: false, default: false },
      version: {
        type: "string",
        required: false,
        pattern: /^\d+\.\d+\.\d+$/,
        default: "1.0.0",
      },
      createdAt: { type: "number", required: true, validator: "positive" },
      modifiedAt: { type: "number", required: true, validator: "positive" },
      metadata: {
        type: "object",
        required: false,
        properties: {
          author: { type: "string", required: false },
          description: { type: "string", required: false, maxLength: 500 },
          tags: { type: "array", required: false, items: { type: "string" } },
        },
      },
      data: { type: "object", required: true },
    });

    // Global State Schema
    this.addSchema("globalState", {
      tempo: { type: "number", required: true, validator: "tempo" },
      isPlaying: { type: "boolean", required: true },
      currentPlayer: {
        type: "number",
        required: true,
        validator: "playerNumber",
      },
      numberOfPlayers: {
        type: "number",
        required: true,
        min: 1,
        max: 8,
        validator: "integer",
      },
      loopPosition: {
        type: "number",
        required: true,
        min: 0,
        max: 100,
        validator: "sliderValue",
      },
    });

    // Mixer Level Schema
    this.addSchema("mixerLevels", {
      kick: { type: "number", required: true, validator: "sliderValue" },
      snare: { type: "number", required: true, validator: "sliderValue" },
      hihat: { type: "number", required: true, validator: "sliderValue" },
      tom1: { type: "number", required: false, validator: "sliderValue" },
      tom2: { type: "number", required: false, validator: "sliderValue" },
      crash: { type: "number", required: false, validator: "sliderValue" },
      ride: { type: "number", required: false, validator: "sliderValue" },
      percussion: { type: "number", required: false, validator: "sliderValue" },
      room: { type: "number", required: false, validator: "sliderValue" },
      overhead: { type: "number", required: false, validator: "sliderValue" },
    });
  }

  /**
   * Add custom validator
   */
  addValidator(name, validatorFn) {
    if (typeof validatorFn !== "function") {
      throw new Error("Validator must be a function");
    }
    this.customValidators.set(name, validatorFn);
  }

  /**
   * Add schema
   */
  addSchema(name, schema) {
    this.schemas.set(name, schema);
  }

  /**
   * Validate value against schema
   */
  validate(value, schemaName, options = {}) {
    this.stats.validations++;
    this.errors = [];

    // Check cache
    const cacheKey = this.getCacheKey(value, schemaName);
    if (!options.noCache && this.validationCache.has(cacheKey)) {
      this.stats.cacheHits++;
      const cached = this.validationCache.get(cacheKey);
      if (cached.valid) {
        this.stats.passed++;
      } else {
        this.stats.failed++;
        this.errors = cached.errors;
      }
      return cached.valid;
    }

    const schema = this.schemas.get(schemaName);
    if (!schema) {
      this.addError(`Schema not found: ${schemaName}`);
      this.stats.failed++;
      return false;
    }

    const result = this.validateAgainstSchema(value, schema, schemaName);

    // Cache result
    if (!options.noCache) {
      this.cacheValidation(cacheKey, result, [...this.errors]);
    }

    if (result) {
      this.stats.passed++;
    } else {
      this.stats.failed++;
    }

    return result;
  }

  /**
   * Validate against schema
   */
  validateAgainstSchema(value, schema, path = "") {
    // Handle null/undefined
    if (value === null || value === undefined) {
      if (schema.required) {
        this.addError(`${path} is required`);
        return false;
      }
      return true;
    }

    // If schema is a direct property definition
    if (schema.type) {
      return this.validateProperty(value, schema, path);
    }

    // If schema is an object with properties
    if (schema.properties) {
      return this.validateObjectProperties(value, schema, path);
    }

    // Validate each property in the schema
    let valid = true;
    for (const [key, propSchema] of Object.entries(schema)) {
      const propPath = path ? `${path}.${key}` : key;
      const propValue = value[key];

      if (!this.validateProperty(propValue, propSchema, propPath)) {
        valid = false;
      }
    }

    return valid;
  }

  /**
   * Validate single property
   */
  validateProperty(value, schema, path) {
    // Check required
    if (value === undefined || value === null) {
      if (schema.required) {
        this.addError(`${path} is required`);
        return false;
      }
      // Apply default if provided
      if (schema.default !== undefined) {
        value = schema.default;
      } else {
        return true; // Optional and no default
      }
    }

    // Check type
    if (schema.type) {
      const typeValidator = this.customValidators.get(schema.type);
      if (typeValidator && !typeValidator(value)) {
        this.addError(`${path} must be of type ${schema.type}`);
        return false;
      }
    }

    // Check custom validator
    if (schema.validator) {
      const validator = this.customValidators.get(schema.validator);
      if (validator && !validator(value)) {
        this.addError(`${path} failed validation: ${schema.validator}`);
        return false;
      }
    }

    // Check pattern
    if (schema.pattern && typeof value === "string") {
      const regex =
        schema.pattern instanceof RegExp
          ? schema.pattern
          : new RegExp(schema.pattern);
      if (!regex.test(value)) {
        this.addError(`${path} does not match pattern: ${schema.pattern}`);
        return false;
      }
    }

    // Check min/max for numbers
    if (typeof value === "number") {
      if (schema.min !== undefined && value < schema.min) {
        this.addError(`${path} must be at least ${schema.min}`);
        return false;
      }
      if (schema.max !== undefined && value > schema.max) {
        this.addError(`${path} must be at most ${schema.max}`);
        return false;
      }
    }

    // Check length for strings and arrays
    if (typeof value === "string" || Array.isArray(value)) {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        this.addError(
          `${path} must have at least ${schema.minLength} items/characters`,
        );
        return false;
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        this.addError(
          `${path} must have at most ${schema.maxLength} items/characters`,
        );
        return false;
      }
      if (schema.length !== undefined && value.length !== schema.length) {
        this.addError(
          `${path} must have exactly ${schema.length} items/characters`,
        );
        return false;
      }
    }

    // Check array items
    if (Array.isArray(value) && schema.items) {
      for (let i = 0; i < value.length; i++) {
        if (!this.validateProperty(value[i], schema.items, `${path}[${i}]`)) {
          return false;
        }
      }
    }

    // Check object properties
    if (
      schema.properties &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return this.validateObjectProperties(value, schema, path);
    }

    // Check custom validation function
    if (schema.custom && typeof schema.custom === "function") {
      if (!schema.custom(value)) {
        this.addError(`${path} failed custom validation`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validate object properties
   */
  validateObjectProperties(value, schema, path) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      this.addError(`${path} must be an object`);
      return false;
    }

    let valid = true;

    // Check min/max properties
    const propCount = Object.keys(value).length;
    if (
      schema.minProperties !== undefined &&
      propCount < schema.minProperties
    ) {
      this.addError(
        `${path} must have at least ${schema.minProperties} properties`,
      );
      valid = false;
    }
    if (
      schema.maxProperties !== undefined &&
      propCount > schema.maxProperties
    ) {
      this.addError(
        `${path} must have at most ${schema.maxProperties} properties`,
      );
      valid = false;
    }

    // Validate defined properties
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propPath = path ? `${path}.${key}` : key;
        if (!this.validateProperty(value[key], propSchema, propPath)) {
          valid = false;
        }
      }
    }

    // Check additional properties
    if (schema.additionalProperties === false) {
      const definedKeys = new Set(Object.keys(schema.properties || {}));
      for (const key of Object.keys(value)) {
        if (!definedKeys.has(key)) {
          this.addError(`${path} has unexpected property: ${key}`);
          valid = false;
        }
      }
    } else if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    ) {
      // Validate additional properties against schema
      const definedKeys = new Set(Object.keys(schema.properties || {}));
      for (const [key, val] of Object.entries(value)) {
        if (!definedKeys.has(key)) {
          const propPath = path ? `${path}.${key}` : key;
          if (
            !this.validateProperty(val, schema.additionalProperties, propPath)
          ) {
            valid = false;
          }
        }
      }
    }

    return valid;
  }

  /**
   * Validate and auto-correct
   */
  validateAndCorrect(value, schemaName) {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      throw new Error(`Schema not found: ${schemaName}`);
    }

    const corrected = this.autoCorrect(value, schema);
    const valid = this.validate(corrected, schemaName);

    return {
      valid,
      corrected,
      errors: [...this.errors],
      corrections: this.getCorrections(value, corrected),
    };
  }

  /**
   * Auto-correct value based on schema
   */
  autoCorrect(value, schema) {
    if (value === null || value === undefined) {
      if (schema.default !== undefined) {
        return schema.default;
      }
      if (schema.type === "object") {
        return {};
      }
      if (schema.type === "array") {
        return [];
      }
      if (schema.type === "string") {
        return "";
      }
      if (schema.type === "number") {
        return 0;
      }
      if (schema.type === "boolean") {
        return false;
      }
      return value;
    }

    // Correct type if possible
    if (schema.type) {
      value = this.coerceType(value, schema.type);
    }

    // Correct number ranges
    if (typeof value === "number") {
      if (schema.min !== undefined && value < schema.min) {
        value = schema.min;
      }
      if (schema.max !== undefined && value > schema.max) {
        value = schema.max;
      }
    }

    // Correct string length
    if (typeof value === "string") {
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        value = value.substring(0, schema.maxLength);
      }
    }

    // Correct array length
    if (Array.isArray(value)) {
      if (schema.length !== undefined) {
        while (value.length < schema.length) {
          value.push(schema.items?.default || null);
        }
        if (value.length > schema.length) {
          value = value.slice(0, schema.length);
        }
      }
    }

    // Correct object properties
    if (
      schema.properties &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const corrected = {};
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        corrected[key] = this.autoCorrect(value[key], propSchema);
      }
      return corrected;
    }

    return value;
  }

  /**
   * Coerce value to type
   */
  coerceType(value, type) {
    switch (type) {
      case "string":
        return String(value);
      case "number":
        return Number(value) || 0;
      case "boolean":
        return Boolean(value);
      case "array":
        return Array.isArray(value) ? value : [value];
      case "object":
        return typeof value === "object" ? value : {};
      default:
        return value;
    }
  }

  /**
   * Get corrections made
   */
  getCorrections(original, corrected) {
    const corrections = [];

    const compare = (orig, corr, path = "") => {
      if (orig === corr) return;

      if (typeof orig !== typeof corr) {
        corrections.push({
          path,
          type: "type",
          from: typeof orig,
          to: typeof corr,
        });
        return;
      }

      if (typeof orig === "object" && orig !== null && corr !== null) {
        const allKeys = new Set([...Object.keys(orig), ...Object.keys(corr)]);
        for (const key of allKeys) {
          const subPath = path ? `${path}.${key}` : key;
          compare(orig[key], corr[key], subPath);
        }
      } else if (orig !== corr) {
        corrections.push({
          path,
          type: "value",
          from: orig,
          to: corr,
        });
      }
    };

    compare(original, corrected);
    return corrections;
  }

  /**
   * Add error
   */
  addError(message) {
    this.errors.push({
      message,
      timestamp: Date.now(),
    });
  }

  /**
   * Get errors
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Clear errors
   */
  clearErrors() {
    this.errors = [];
  }

  /**
   * Get cache key
   */
  getCacheKey(value, schemaName) {
    const valueStr = JSON.stringify(value);
    return `${schemaName}:${valueStr.substring(0, 100)}:${valueStr.length}`;
  }

  /**
   * Cache validation result
   */
  cacheValidation(key, valid, errors) {
    if (this.validationCache.size >= this.cacheMaxSize) {
      // Remove oldest entry
      const firstKey = this.validationCache.keys().next().value;
      this.validationCache.delete(firstKey);
    }

    this.validationCache.set(key, {
      valid,
      errors,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.validationCache.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.validationCache.size,
      cacheHitRate:
        this.stats.validations > 0
          ? ((this.stats.cacheHits / this.stats.validations) * 100).toFixed(2) +
            "%"
          : "0%",
      passRate:
        this.stats.validations > 0
          ? ((this.stats.passed / this.stats.validations) * 100).toFixed(2) +
            "%"
          : "0%",
      schemas: this.schemas.size,
      validators: this.customValidators.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      validations: 0,
      passed: 0,
      failed: 0,
      cacheHits: 0,
    };
  }

  /**
   * Destroy validator
   */
  destroy() {
    this.clearCache();
    this.clearErrors();
    this.rules.clear();
    this.customValidators.clear();
    this.schemas.clear();
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = DataValidator;
}

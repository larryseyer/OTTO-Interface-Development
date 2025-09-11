/**
 * InputSanitizer.js
 * Comprehensive input sanitization for security and data integrity
 * Phase 3 Implementation
 */

class InputSanitizer {
  constructor() {
    // Sanitization rules
    this.rules = new Map();

    // HTML entities map
    this.htmlEntities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "/": "&#x2F;",
      "`": "&#x60;",
      "=": "&#x3D;",
    };

    // Allowed HTML tags (if any)
    this.allowedTags = new Set();

    // Statistics
    this.stats = {
      sanitized: 0,
      htmlEscaped: 0,
      pathsNormalized: 0,
      sqlPrevented: 0,
      xssPrevented: 0,
    };

    // Initialize rules
    this.initializeRules();
  }

  /**
   * Initialize sanitization rules
   */
  initializeRules() {
    // Text sanitization rules
    this.addRule("text", (value) => this.sanitizeText(value));
    this.addRule("html", (value) => this.sanitizeHTML(value));
    this.addRule("email", (value) => this.sanitizeEmail(value));
    this.addRule("url", (value) => this.sanitizeURL(value));
    this.addRule("filename", (value) => this.sanitizeFileName(value));
    this.addRule("path", (value) => this.sanitizePath(value));

    // OTTO-specific rules
    this.addRule("presetName", (value) => this.sanitizePresetName(value));
    this.addRule("patternName", (value) => this.sanitizePatternName(value));
    this.addRule("kitName", (value) => this.sanitizeKitName(value));
    this.addRule("groupName", (value) => this.sanitizeGroupName(value));

    // Number sanitization
    this.addRule("integer", (value) => this.sanitizeInteger(value));
    this.addRule("float", (value) => this.sanitizeFloat(value));
    this.addRule("tempo", (value) => this.sanitizeTempo(value));
    this.addRule("slider", (value) => this.sanitizeSliderValue(value));

    // Array/Object sanitization
    this.addRule("array", (value) => this.sanitizeArray(value));
    this.addRule("object", (value) => this.sanitizeObject(value));
  }

  /**
   * Add sanitization rule
   */
  addRule(name, sanitizer) {
    if (typeof sanitizer !== "function") {
      throw new Error("Sanitizer must be a function");
    }
    this.rules.set(name, sanitizer);
  }

  /**
   * Sanitize value using rule
   */
  sanitize(value, rule) {
    this.stats.sanitized++;

    const sanitizer = this.rules.get(rule);
    if (!sanitizer) {
      console.warn(`Sanitization rule not found: ${rule}`);
      return value;
    }

    try {
      return sanitizer(value);
    } catch (error) {
      console.error(`Sanitization error for rule ${rule}:`, error);
      return null;
    }
  }

  /**
   * Sanitize text (basic)
   */
  sanitizeText(value) {
    if (typeof value !== "string") {
      return String(value);
    }

    // Remove control characters
    value = value.replace(/[\x00-\x1F\x7F]/g, "");

    // Trim whitespace
    value = value.trim();

    // Normalize whitespace
    value = value.replace(/\s+/g, " ");

    return value;
  }

  /**
   * Sanitize HTML
   */
  sanitizeHTML(value) {
    if (typeof value !== "string") {
      value = String(value);
    }

    this.stats.htmlEscaped++;

    // Escape HTML entities
    value = this.escapeHTML(value);

    // Remove script tags completely
    value = value.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    );

    // Remove on* event handlers
    value = value.replace(/on\w+\s*=\s*"[^"]*"/gi, "");
    value = value.replace(/on\w+\s*=\s*'[^']*'/gi, "");
    value = value.replace(/on\w+\s*=\s*[^\s>]*/gi, "");

    // Remove javascript: protocol
    value = value.replace(/javascript:/gi, "");

    // Remove data: URIs for scripts
    value = value.replace(/data:text\/javascript[^,]*,/gi, "");

    this.stats.xssPrevented++;

    return value;
  }

  /**
   * Escape HTML entities
   */
  escapeHTML(value) {
    return String(value).replace(
      /[&<>"'`=\/]/g,
      (char) => this.htmlEntities[char],
    );
  }

  /**
   * Unescape HTML entities
   */
  unescapeHTML(value) {
    const reverseEntities = Object.entries(this.htmlEntities).reduce(
      (acc, [char, entity]) => {
        acc[entity] = char;
        return acc;
      },
      {},
    );

    return String(value).replace(
      /&[#\w]+;/g,
      (entity) => reverseEntities[entity] || entity,
    );
  }

  /**
   * Sanitize email
   */
  sanitizeEmail(value) {
    if (typeof value !== "string") return "";

    // Convert to lowercase
    value = value.toLowerCase().trim();

    // Remove any characters that aren't typically in emails
    value = value.replace(/[^a-z0-9@.\-_+]/g, "");

    // Ensure only one @ symbol
    const parts = value.split("@");
    if (parts.length > 2) {
      value = parts[0] + "@" + parts.slice(1).join("");
    }

    // Basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "";
    }

    return value;
  }

  /**
   * Sanitize URL
   */
  sanitizeURL(value) {
    if (typeof value !== "string") return "";

    value = value.trim();

    // Block dangerous protocols
    const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
    for (const protocol of dangerousProtocols) {
      if (value.toLowerCase().startsWith(protocol)) {
        return "";
      }
    }

    try {
      const url = new URL(value);

      // Only allow http(s) and ftp
      if (!["http:", "https:", "ftp:"].includes(url.protocol)) {
        return "";
      }

      // Remove credentials from URL
      url.username = "";
      url.password = "";

      return url.toString();
    } catch {
      // If not a valid URL, return empty
      return "";
    }
  }

  /**
   * Sanitize file name
   */
  sanitizeFileName(value) {
    if (typeof value !== "string") return "";

    value = value.trim();

    // Remove path separators
    value = value.replace(/[\/\\]/g, "");

    // Remove special characters that could cause issues
    value = value.replace(/[<>:"|?*\x00-\x1F]/g, "");

    // Remove leading dots (hidden files)
    value = value.replace(/^\.+/, "");

    // Limit length
    if (value.length > 255) {
      const extension = value.match(/\.[^.]+$/)?.[0] || "";
      const nameWithoutExt = value.substring(
        0,
        value.length - extension.length,
      );
      value = nameWithoutExt.substring(0, 255 - extension.length) + extension;
    }

    // Prevent reserved names (Windows)
    const reserved = [
      "CON",
      "PRN",
      "AUX",
      "NUL",
      "COM1",
      "COM2",
      "COM3",
      "COM4",
      "COM5",
      "COM6",
      "COM7",
      "COM8",
      "COM9",
      "LPT1",
      "LPT2",
      "LPT3",
      "LPT4",
      "LPT5",
      "LPT6",
      "LPT7",
      "LPT8",
      "LPT9",
    ];

    const nameWithoutExt = value.replace(/\.[^.]+$/, "");
    if (reserved.includes(nameWithoutExt.toUpperCase())) {
      value = "_" + value;
    }

    return value || "unnamed";
  }

  /**
   * Sanitize file path
   */
  sanitizePath(value) {
    if (typeof value !== "string") return "";

    value = value.trim();

    // Prevent path traversal
    value = value.replace(/\.\./g, "");

    // Normalize slashes
    value = value.replace(/\\/g, "/");

    // Remove double slashes
    value = value.replace(/\/+/g, "/");

    // Remove leading slash for relative paths
    if (!value.startsWith("/")) {
      value = value.replace(/^\//, "");
    }

    // Sanitize each segment
    const segments = value.split("/");
    const sanitized = segments
      .map((segment) => this.sanitizeFileName(segment))
      .filter((segment) => segment.length > 0);

    this.stats.pathsNormalized++;

    return sanitized.join("/");
  }

  /**
   * Sanitize preset name
   */
  sanitizePresetName(value) {
    if (typeof value !== "string") return "Untitled";

    value = this.sanitizeText(value);

    // Allow alphanumeric, spaces, dashes, underscores, parentheses
    value = value.replace(/[^a-zA-Z0-9\s\-_()]/g, "");

    // Limit length
    if (value.length > 50) {
      value = value.substring(0, 50);
    }

    return value || "Untitled";
  }

  /**
   * Sanitize pattern name
   */
  sanitizePatternName(value) {
    if (typeof value !== "string") return "empty";

    value = this.sanitizeText(value);

    // Allow alphanumeric, spaces, dashes, underscores
    value = value.replace(/[^a-zA-Z0-9\s\-_]/g, "");

    // Convert to lowercase with dashes
    value = value.toLowerCase().replace(/\s+/g, "-");

    // Limit length
    if (value.length > 50) {
      value = value.substring(0, 50);
    }

    return value || "empty";
  }

  /**
   * Sanitize kit name
   */
  sanitizeKitName(value) {
    if (typeof value !== "string") return "Default";

    value = this.sanitizeText(value);

    // Allow alphanumeric, spaces, dashes, underscores
    value = value.replace(/[^a-zA-Z0-9\s\-_]/g, "");

    // Limit length
    if (value.length > 50) {
      value = value.substring(0, 50);
    }

    return value || "Default";
  }

  /**
   * Sanitize group name
   */
  sanitizeGroupName(value) {
    if (typeof value !== "string") return "Group";

    value = this.sanitizeText(value);

    // Allow alphanumeric, spaces, dashes, underscores
    value = value.replace(/[^a-zA-Z0-9\s\-_]/g, "");

    // Limit length
    if (value.length > 50) {
      value = value.substring(0, 50);
    }

    return value || "Group";
  }

  /**
   * Sanitize integer
   */
  sanitizeInteger(value) {
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Sanitize float
   */
  sanitizeFloat(value) {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Sanitize tempo
   */
  sanitizeTempo(value) {
    const tempo = this.sanitizeInteger(value);
    return Math.max(30, Math.min(300, tempo));
  }

  /**
   * Sanitize slider value
   */
  sanitizeSliderValue(value) {
    const val = this.sanitizeFloat(value);
    return Math.max(0, Math.min(100, val));
  }

  /**
   * Sanitize array
   */
  sanitizeArray(value, itemSanitizer = null) {
    if (!Array.isArray(value)) {
      return [];
    }

    if (itemSanitizer && this.rules.has(itemSanitizer)) {
      return value.map((item) => this.sanitize(item, itemSanitizer));
    }

    return value.map((item) => {
      if (typeof item === "string") {
        return this.sanitizeText(item);
      }
      return item;
    });
  }

  /**
   * Sanitize object
   */
  sanitizeObject(value, schema = null) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {};
    }

    const sanitized = {};

    for (const [key, val] of Object.entries(value)) {
      // Sanitize key
      const sanitizedKey = this.sanitizeText(key).replace(/[^a-zA-Z0-9_]/g, "");

      // Sanitize value based on schema if provided
      if (schema && schema[sanitizedKey]) {
        sanitized[sanitizedKey] = this.sanitize(val, schema[sanitizedKey]);
      } else if (typeof val === "string") {
        sanitized[sanitizedKey] = this.sanitizeText(val);
      } else {
        sanitized[sanitizedKey] = val;
      }
    }

    return sanitized;
  }

  /**
   * Prevent SQL injection
   */
  preventSQLInjection(value) {
    if (typeof value !== "string") return value;

    this.stats.sqlPrevented++;

    // Escape single quotes
    value = value.replace(/'/g, "''");

    // Remove SQL keywords in suspicious contexts
    const sqlKeywords = [
      "DROP",
      "DELETE",
      "INSERT",
      "UPDATE",
      "SELECT",
      "UNION",
      "WHERE",
      "FROM",
      "JOIN",
      "EXEC",
      "SCRIPT",
      "JAVASCRIPT",
      "--",
      "/*",
      "*/",
      "XP_",
      "SP_",
    ];

    sqlKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      value = value.replace(regex, "");
    });

    return value;
  }

  /**
   * Prevent XSS
   */
  preventXSS(value) {
    if (typeof value !== "string") return value;

    this.stats.xssPrevented++;

    // Remove all HTML tags
    value = value.replace(/<[^>]*>/g, "");

    // Escape remaining special characters
    value = this.escapeHTML(value);

    // Remove javascript: and data: protocols
    value = value.replace(/javascript:/gi, "");
    value = value.replace(/data:text\/html/gi, "");

    return value;
  }

  /**
   * Sanitize JSON string
   */
  sanitizeJSON(value) {
    if (typeof value !== "string") return "{}";

    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(this.sanitizeObject(parsed));
    } catch {
      return "{}";
    }
  }

  /**
   * Batch sanitize
   */
  batchSanitize(values, rule) {
    if (!Array.isArray(values)) {
      return [];
    }

    return values.map((value) => this.sanitize(value, rule));
  }

  /**
   * Create sanitized copy
   */
  createSanitizedCopy(obj, schema) {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.createSanitizedCopy(item, schema));
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = this.sanitizeText(key).replace(/[^a-zA-Z0-9_]/g, "");

      if (schema && schema[sanitizedKey]) {
        if (typeof schema[sanitizedKey] === "string") {
          sanitized[sanitizedKey] = this.sanitize(value, schema[sanitizedKey]);
        } else if (typeof schema[sanitizedKey] === "object") {
          sanitized[sanitizedKey] = this.createSanitizedCopy(
            value,
            schema[sanitizedKey],
          );
        } else {
          sanitized[sanitizedKey] = value;
        }
      } else {
        sanitized[sanitizedKey] = this.createSanitizedCopy(value, null);
      }
    }

    return sanitized;
  }

  /**
   * Get statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      sanitized: 0,
      htmlEscaped: 0,
      pathsNormalized: 0,
      sqlPrevented: 0,
      xssPrevented: 0,
    };
  }

  /**
   * Destroy sanitizer
   */
  destroy() {
    this.rules.clear();
    this.allowedTags.clear();
    this.resetStats();
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = InputSanitizer;
}

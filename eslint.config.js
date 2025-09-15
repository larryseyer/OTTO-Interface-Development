module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        alert: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        localStorage: "readonly",
        URLSearchParams: "readonly",
        URL: "readonly",
        fetch: "readonly",
        AudioContext: "readonly",
        webkitAudioContext: "readonly",
        AudioWorkletNode: "readonly",
        debugLog: "readonly",
        debugError: "readonly",
        debugWarn: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "off",
      "semi": ["error", "always"],
      "quotes": ["warn", "double", { "allowTemplateLiterals": true }]
    }
  }
];
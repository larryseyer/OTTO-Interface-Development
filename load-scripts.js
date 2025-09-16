/**
 * Dynamic Script Loader with Automatic Cache Busting
 * Ensures fresh content on every page load for development
 */

(function() {
    // Generate timestamp for cache busting
    const timestamp = Date.now();

    // List of all scripts to load in order
    const scripts = [
        // Phase 1: Core Infrastructure
        'EventManager.js',
        'TimerManager.js',
        'StateManager.js',
        // Phase 2: Manager Classes
        'PlayerStateManager.js',
        'PhraseStateManager.js',
        'PatternGroupManager.js',
        'DrumkitManager.js',
        'MixerPresetManager.js',
        'MixerComponent.js',
        'PresetManager.js',
        'LinkManager.js',
        'StorageManager.js',
        // Phase 3: Data Integrity & Validation
        'DataValidator.js',
        'InputSanitizer.js',
        // Phase 4: Performance Optimizations
        'DOMCacheManager.js',
        'RenderOptimizer.js',
        'AudioScheduler.js',
        'ResourcePool.js',
        // Phase 5: UI Component Refactoring
        'UIComponent.js',
        'SliderComponent.js',
        'ButtonComponent.js',
        'PatternGridComponent.js',
        // Window Manager
        'WindowManager.js',
        // Drum Map Components
        'DrumMapManager.js',
        'DrumMapPresets.js',
        'SFZEditor.js',
        'MidiTranslator.js',
        'DrumMapUI.js',
        'DrumMapAdvanced.js',
        // Main Script
        'script.js'
    ];

    // Load scripts sequentially with timestamp
    scripts.forEach(script => {
        document.write(`<script src="${script}?t=${timestamp}"><\/script>`);
    });

    // Update CSS with timestamp on every load
    document.addEventListener('DOMContentLoaded', function() {
        const styleLink = document.querySelector('link[href*="styles.css"]');
        if (styleLink) {
            styleLink.href = `styles.css?t=${timestamp}`;
        }
    });

    // Also write the CSS link with timestamp directly
    const existingStyleLink = document.querySelector('link[href*="styles.css"]');
    if (existingStyleLink) {
        existingStyleLink.href = `styles.css?t=${timestamp}`;
    }
})();
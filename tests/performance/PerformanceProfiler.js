/**
 * Performance Profiler for OTTO Interface
 * Measures and analyzes performance metrics
 */

class PerformanceProfiler {
    constructor() {
        this.metrics = new Map();
        this.marks = new Map();
        this.measures = [];
        this.memorySnapshots = [];
        this.frameMetrics = [];
        this.isRecording = false;
        this.rafId = null;
    }

    /**
     * Start performance recording
     */
    startRecording() {
        this.isRecording = true;
        this.metrics.clear();
        this.marks.clear();
        this.measures = [];
        this.memorySnapshots = [];
        this.frameMetrics = [];
        
        // Start frame rate monitoring
        this.startFrameMonitoring();
        
        // Take initial memory snapshot
        this.takeMemorySnapshot('start');
        
        console.log('🎬 Performance recording started');
    }

    /**
     * Stop performance recording
     */
    stopRecording() {
        this.isRecording = false;
        
        // Stop frame monitoring
        this.stopFrameMonitoring();
        
        // Take final memory snapshot
        this.takeMemorySnapshot('end');
        
        console.log('🛑 Performance recording stopped');
        
        return this.generateReport();
    }

    /**
     * Mark a performance point
     */
    mark(name) {
        if (!this.isRecording) return;
        
        const timestamp = performance.now();
        this.marks.set(name, timestamp);
        
        if (performance.mark) {
            performance.mark(name);
        }
    }

    /**
     * Measure between two marks
     */
    measure(name, startMark, endMark) {
        if (!this.isRecording) return;
        
        const start = this.marks.get(startMark);
        const end = this.marks.get(endMark);
        
        if (start && end) {
            const duration = end - start;
            this.measures.push({
                name,
                start,
                end,
                duration
            });
            
            if (performance.measure) {
                performance.measure(name, startMark, endMark);
            }
            
            return duration;
        }
        
        return null;
    }

    /**
     * Profile a function execution
     */
    async profile(name, fn) {
        const startMark = `${name}-start`;
        const endMark = `${name}-end`;
        
        this.mark(startMark);
        const startMemory = this.getMemoryUsage();
        
        try {
            const result = await fn();
            
            this.mark(endMark);
            const endMemory = this.getMemoryUsage();
            
            const duration = this.measure(name, startMark, endMark);
            const memoryDelta = endMemory - startMemory;
            
            this.metrics.set(name, {
                duration,
                memoryDelta,
                timestamp: Date.now()
            });
            
            return result;
        } catch (error) {
            this.mark(endMark);
            throw error;
        }
    }

    /**
     * Get current memory usage
     */
    getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * Take a memory snapshot
     */
    takeMemorySnapshot(label) {
        if (!this.isRecording) return;
        
        const snapshot = {
            label,
            timestamp: performance.now(),
            memory: this.getMemoryUsage(),
            domNodes: document.getElementsByTagName('*').length,
            listeners: this.countEventListeners()
        };
        
        this.memorySnapshots.push(snapshot);
        return snapshot;
    }

    /**
     * Count event listeners (approximate)
     */
    countEventListeners() {
        let count = 0;
        const allElements = document.getElementsByTagName('*');
        
        // This is an approximation - actual count would require access to internal browser APIs
        for (let element of allElements) {
            // Check for common event properties
            const events = ['onclick', 'onchange', 'onmouseover', 'onmouseout', 'onkeydown', 'onkeyup'];
            for (let event of events) {
                if (element[event]) count++;
            }
        }
        
        return count;
    }

    /**
     * Start frame rate monitoring
     */
    startFrameMonitoring() {
        let lastTime = performance.now();
        let frames = 0;
        let fps = 0;
        
        const measureFrame = (currentTime) => {
            frames++;
            
            if (currentTime >= lastTime + 1000) {
                fps = Math.round((frames * 1000) / (currentTime - lastTime));
                this.frameMetrics.push({
                    fps,
                    timestamp: currentTime,
                    frameTime: currentTime - lastTime
                });
                
                frames = 0;
                lastTime = currentTime;
            }
            
            if (this.isRecording) {
                this.rafId = requestAnimationFrame(measureFrame);
            }
        };
        
        this.rafId = requestAnimationFrame(measureFrame);
    }

    /**
     * Stop frame rate monitoring
     */
    stopFrameMonitoring() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /**
     * Benchmark a function
     */
    async benchmark(name, fn, iterations = 100) {
        console.log(`⏱️  Benchmarking "${name}" with ${iterations} iterations...`);
        
        const times = [];
        const startMemory = this.getMemoryUsage();
        
        // Warmup
        for (let i = 0; i < 10; i++) {
            await fn();
        }
        
        // Actual benchmark
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await fn();
            const end = performance.now();
            times.push(end - start);
        }
        
        const endMemory = this.getMemoryUsage();
        
        // Calculate statistics
        const sorted = times.sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const median = sorted[Math.floor(sorted.length / 2)];
        const average = times.reduce((a, b) => a + b, 0) / times.length;
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        
        const result = {
            name,
            iterations,
            min: min.toFixed(2),
            max: max.toFixed(2),
            median: median.toFixed(2),
            average: average.toFixed(2),
            p95: p95.toFixed(2),
            p99: p99.toFixed(2),
            memoryDelta: endMemory - startMemory,
            opsPerSecond: Math.round(1000 / average)
        };
        
        console.log(`✅ Benchmark complete:`, result);
        
        return result;
    }

    /**
     * Detect memory leaks
     */
    async detectMemoryLeaks(fn, iterations = 10) {
        console.log(`🔍 Checking for memory leaks...`);
        
        const memoryReadings = [];
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        for (let i = 0; i < iterations; i++) {
            await fn();
            
            // Wait a bit for any async operations
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            memoryReadings.push(this.getMemoryUsage());
        }
        
        // Analyze memory trend
        const firstHalf = memoryReadings.slice(0, Math.floor(iterations / 2));
        const secondHalf = memoryReadings.slice(Math.floor(iterations / 2));
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        const growth = secondAvg - firstAvg;
        const growthPercent = (growth / firstAvg) * 100;
        
        const hasLeak = growthPercent > 10; // More than 10% growth suggests a leak
        
        return {
            hasLeak,
            growth,
            growthPercent: growthPercent.toFixed(2),
            readings: memoryReadings,
            analysis: hasLeak ? 
                '⚠️ Potential memory leak detected' : 
                '✅ No memory leak detected'
        };
    }

    /**
     * Profile DOM operations
     */
    profileDOM(name, fn) {
        const startNodes = document.getElementsByTagName('*').length;
        const startReflows = this.getReflowCount();
        
        this.mark(`${name}-dom-start`);
        const result = fn();
        this.mark(`${name}-dom-end`);
        
        const endNodes = document.getElementsByTagName('*').length;
        const endReflows = this.getReflowCount();
        
        const metrics = {
            name,
            duration: this.measure(`${name}-dom`, `${name}-dom-start`, `${name}-dom-end`),
            nodesAdded: endNodes - startNodes,
            reflows: endReflows - startReflows
        };
        
        this.metrics.set(`${name}-dom`, metrics);
        
        return result;
    }

    /**
     * Get reflow count (approximation)
     */
    getReflowCount() {
        // This is a placeholder - actual reflow counting would require browser dev tools API
        return 0;
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const report = {
            summary: {
                totalDuration: this.measures.reduce((sum, m) => sum + m.duration, 0),
                measureCount: this.measures.length,
                avgFrameRate: this.calculateAverageFrameRate(),
                memoryDelta: this.calculateMemoryDelta(),
                timestamp: new Date().toISOString()
            },
            measures: this.measures,
            memorySnapshots: this.memorySnapshots,
            frameMetrics: this.frameMetrics,
            metrics: Array.from(this.metrics.entries()).map(([name, data]) => ({
                name,
                ...data
            }))
        };
        
        return report;
    }

    /**
     * Calculate average frame rate
     */
    calculateAverageFrameRate() {
        if (this.frameMetrics.length === 0) return 0;
        
        const sum = this.frameMetrics.reduce((acc, m) => acc + m.fps, 0);
        return Math.round(sum / this.frameMetrics.length);
    }

    /**
     * Calculate memory delta
     */
    calculateMemoryDelta() {
        if (this.memorySnapshots.length < 2) return 0;
        
        const first = this.memorySnapshots[0];
        const last = this.memorySnapshots[this.memorySnapshots.length - 1];
        
        return last.memory - first.memory;
    }

    /**
     * Print report to console
     */
    printReport(report) {
        console.log('\n📊 Performance Report\n' + '='.repeat(50));
        
        console.log('\n📈 Summary:');
        console.log(`  Total Duration: ${report.summary.totalDuration.toFixed(2)}ms`);
        console.log(`  Average FPS: ${report.summary.avgFrameRate}`);
        console.log(`  Memory Delta: ${(report.summary.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
        
        if (report.measures.length > 0) {
            console.log('\n⏱️  Measures:');
            report.measures.forEach(m => {
                console.log(`  ${m.name}: ${m.duration.toFixed(2)}ms`);
            });
        }
        
        if (report.memorySnapshots.length > 0) {
            console.log('\n💾 Memory Snapshots:');
            report.memorySnapshots.forEach(s => {
                console.log(`  ${s.label}: ${(s.memory / 1024 / 1024).toFixed(2)}MB, ${s.domNodes} DOM nodes`);
            });
        }
        
        console.log('\n' + '='.repeat(50));
    }

    /**
     * Export report as JSON
     */
    exportReport(report) {
        const json = JSON.stringify(report, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

/**
 * Performance test runner
 */
class PerformanceTestRunner {
    constructor() {
        this.profiler = new PerformanceProfiler();
        this.tests = [];
    }

    /**
     * Add a performance test
     */
    addTest(name, fn, options = {}) {
        this.tests.push({
            name,
            fn,
            iterations: options.iterations || 100,
            threshold: options.threshold || null
        });
    }

    /**
     * Run all performance tests
     */
    async runAll() {
        console.log('🚀 Running performance tests...\n');
        
        const results = [];
        
        for (const test of this.tests) {
            const result = await this.profiler.benchmark(
                test.name,
                test.fn,
                test.iterations
            );
            
            // Check threshold
            if (test.threshold) {
                const passed = result.average <= test.threshold;
                result.passed = passed;
                result.threshold = test.threshold;
                
                if (!passed) {
                    console.warn(`⚠️ Test "${test.name}" exceeded threshold: ${result.average}ms > ${test.threshold}ms`);
                }
            }
            
            results.push(result);
        }
        
        return results;
    }

    /**
     * Run memory leak detection
     */
    async detectLeaks() {
        console.log('\n🔍 Running memory leak detection...\n');
        
        const results = [];
        
        for (const test of this.tests) {
            const result = await this.profiler.detectMemoryLeaks(
                test.fn,
                20
            );
            
            results.push({
                name: test.name,
                ...result
            });
        }
        
        return results;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceProfiler, PerformanceTestRunner };
} else {
    window.PerformanceProfiler = PerformanceProfiler;
    window.PerformanceTestRunner = PerformanceTestRunner;
}
/**
 * OTTO Test Framework
 * Lightweight testing framework for OTTO interface components
 * Designed to be easily portable to JUCE's unit testing framework
 */

class TestFramework {
    constructor() {
        this.suites = new Map();
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };
        this.currentSuite = null;
        this.beforeEachHooks = [];
        this.afterEachHooks = [];
        this.timeouts = new Map();
    }

    /**
     * Define a test suite
     */
    describe(suiteName, callback) {
        const suite = {
            name: suiteName,
            tests: [],
            beforeAll: null,
            afterAll: null,
            beforeEach: null,
            afterEach: null
        };
        
        this.suites.set(suiteName, suite);
        this.currentSuite = suite;
        
        try {
            callback();
        } catch (error) {
            console.error(`Error defining suite "${suiteName}":`, error);
        }
        
        this.currentSuite = null;
        return suite;
    }

    /**
     * Define a test case
     */
    it(testName, callback, options = {}) {
        if (!this.currentSuite) {
            throw new Error('Test must be defined within a describe block');
        }
        
        this.currentSuite.tests.push({
            name: testName,
            callback,
            timeout: options.timeout || 5000,
            skip: options.skip || false,
            only: options.only || false
        });
    }

    /**
     * Skip a test
     */
    skip(testName, callback) {
        this.it(testName, callback, { skip: true });
    }

    /**
     * Run only this test
     */
    only(testName, callback) {
        this.it(testName, callback, { only: true });
    }

    /**
     * Setup hook - runs before all tests in suite
     */
    beforeAll(callback) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll = callback;
        }
    }

    /**
     * Teardown hook - runs after all tests in suite
     */
    afterAll(callback) {
        if (this.currentSuite) {
            this.currentSuite.afterAll = callback;
        }
    }

    /**
     * Setup hook - runs before each test
     */
    beforeEach(callback) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach = callback;
        } else {
            this.beforeEachHooks.push(callback);
        }
    }

    /**
     * Teardown hook - runs after each test
     */
    afterEach(callback) {
        if (this.currentSuite) {
            this.currentSuite.afterEach = callback;
        } else {
            this.afterEachHooks.push(callback);
        }
    }

    /**
     * Run all test suites
     */
    async runAll() {
        console.log('🧪 Starting OTTO Test Suite\n');
        const startTime = Date.now();
        
        for (const [suiteName, suite] of this.suites) {
            await this.runSuite(suite);
        }
        
        const duration = Date.now() - startTime;
        this.printResults(duration);
        
        return this.results.failed === 0;
    }

    /**
     * Run a single test suite
     */
    async runSuite(suite) {
        console.log(`\n📦 ${suite.name}`);
        
        // Check if any tests are marked as 'only'
        const onlyTests = suite.tests.filter(test => test.only);
        const testsToRun = onlyTests.length > 0 ? onlyTests : suite.tests;
        
        // Run beforeAll hook
        if (suite.beforeAll) {
            try {
                await this.runWithTimeout(suite.beforeAll(), 10000);
            } catch (error) {
                console.error(`  ❌ beforeAll hook failed: ${error.message}`);
                return;
            }
        }
        
        // Run each test
        for (const test of testsToRun) {
            if (test.skip) {
                this.results.skipped++;
                console.log(`  ⏭️  ${test.name} (skipped)`);
                continue;
            }
            
            await this.runTest(test, suite);
        }
        
        // Run afterAll hook
        if (suite.afterAll) {
            try {
                await this.runWithTimeout(suite.afterAll(), 10000);
            } catch (error) {
                console.error(`  ❌ afterAll hook failed: ${error.message}`);
            }
        }
    }

    /**
     * Run a single test
     */
    async runTest(test, suite) {
        const startTime = Date.now();
        
        try {
            // Run beforeEach hooks
            for (const hook of this.beforeEachHooks) {
                await this.runWithTimeout(hook(), 5000);
            }
            if (suite.beforeEach) {
                await this.runWithTimeout(suite.beforeEach(), 5000);
            }
            
            // Run the test
            await this.runWithTimeout(test.callback(), test.timeout);
            
            // Run afterEach hooks
            if (suite.afterEach) {
                await this.runWithTimeout(suite.afterEach(), 5000);
            }
            for (const hook of this.afterEachHooks) {
                await this.runWithTimeout(hook(), 5000);
            }
            
            const duration = Date.now() - startTime;
            this.results.passed++;
            console.log(`  ✅ ${test.name} (${duration}ms)`);
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.results.failed++;
            this.results.errors.push({
                suite: suite.name,
                test: test.name,
                error: error.message,
                stack: error.stack
            });
            console.log(`  ❌ ${test.name} (${duration}ms)`);
            console.error(`     ${error.message}`);
        }
    }

    /**
     * Run a function with timeout
     */
    runWithTimeout(promise, timeout) {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Test timeout')), timeout);
            })
        ]);
    }

    /**
     * Print test results
     */
    printResults(duration) {
        console.log('\n' + '='.repeat(50));
        console.log('📊 Test Results\n');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⏭️  Skipped: ${this.results.skipped}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.errors.forEach(error => {
                console.log(`\n  ${error.suite} > ${error.test}`);
                console.log(`    ${error.error}`);
            });
        }
        
        console.log('\n' + '='.repeat(50));
        
        if (this.results.failed === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('💔 Some tests failed.');
        }
    }

    /**
     * Reset the framework for a new test run
     */
    reset() {
        this.suites.clear();
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };
        this.currentSuite = null;
        this.beforeEachHooks = [];
        this.afterEachHooks = [];
        this.timeouts.clear();
    }
}

/**
 * Assertion Library
 */
class Assert {
    static equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, but got ${actual}`);
        }
    }

    static deepEqual(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || `Objects are not deeply equal`);
        }
    }

    static notEqual(actual, expected, message) {
        if (actual === expected) {
            throw new Error(message || `Expected values to be different, but both are ${actual}`);
        }
    }

    static isTrue(value, message) {
        if (value !== true) {
            throw new Error(message || `Expected true, but got ${value}`);
        }
    }

    static isFalse(value, message) {
        if (value !== false) {
            throw new Error(message || `Expected false, but got ${value}`);
        }
    }

    static isNull(value, message) {
        if (value !== null) {
            throw new Error(message || `Expected null, but got ${value}`);
        }
    }

    static isNotNull(value, message) {
        if (value === null) {
            throw new Error(message || `Expected non-null value, but got null`);
        }
    }

    static isDefined(value, message) {
        if (value === undefined) {
            throw new Error(message || `Expected defined value, but got undefined`);
        }
    }

    static isUndefined(value, message) {
        if (value !== undefined) {
            throw new Error(message || `Expected undefined, but got ${value}`);
        }
    }

    static throws(callback, expectedError, message) {
        let threw = false;
        let actualError = null;
        
        try {
            callback();
        } catch (error) {
            threw = true;
            actualError = error;
        }
        
        if (!threw) {
            throw new Error(message || 'Expected function to throw an error');
        }
        
        if (expectedError && !(actualError instanceof expectedError)) {
            throw new Error(message || `Expected ${expectedError.name}, but got ${actualError.constructor.name}`);
        }
    }

    static async throwsAsync(callback, expectedError, message) {
        let threw = false;
        let actualError = null;
        
        try {
            await callback();
        } catch (error) {
            threw = true;
            actualError = error;
        }
        
        if (!threw) {
            throw new Error(message || 'Expected async function to throw an error');
        }
        
        if (expectedError && !(actualError instanceof expectedError)) {
            throw new Error(message || `Expected ${expectedError.name}, but got ${actualError.constructor.name}`);
        }
    }

    static contains(array, value, message) {
        if (!array.includes(value)) {
            throw new Error(message || `Array does not contain ${value}`);
        }
    }

    static notContains(array, value, message) {
        if (array.includes(value)) {
            throw new Error(message || `Array should not contain ${value}`);
        }
    }

    static greaterThan(actual, expected, message) {
        if (actual <= expected) {
            throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
        }
    }

    static lessThan(actual, expected, message) {
        if (actual >= expected) {
            throw new Error(message || `Expected ${actual} to be less than ${expected}`);
        }
    }

    static inRange(value, min, max, message) {
        if (value < min || value > max) {
            throw new Error(message || `Expected ${value} to be between ${min} and ${max}`);
        }
    }

    static instanceOf(object, constructor, message) {
        if (!(object instanceof constructor)) {
            throw new Error(message || `Expected instance of ${constructor.name}`);
        }
    }

    static hasProperty(object, property, message) {
        if (!(property in object)) {
            throw new Error(message || `Object does not have property "${property}"`);
        }
    }

    static typeOf(value, type, message) {
        if (typeof value !== type) {
            throw new Error(message || `Expected type ${type}, but got ${typeof value}`);
        }
    }
}

/**
 * Mock utilities for testing
 */
class Mock {
    constructor() {
        this.calls = [];
        this.returnValue = undefined;
        this.implementation = null;
    }

    static fn(implementation) {
        const mock = new Mock();
        if (implementation) {
            mock.implementation = implementation;
        }
        
        const mockFn = (...args) => {
            mock.calls.push(args);
            if (mock.implementation) {
                return mock.implementation(...args);
            }
            return mock.returnValue;
        };
        
        mockFn.mock = mock;
        mockFn.mockReturnValue = (value) => {
            mock.returnValue = value;
            return mockFn;
        };
        mockFn.mockImplementation = (fn) => {
            mock.implementation = fn;
            return mockFn;
        };
        mockFn.mockClear = () => {
            mock.calls = [];
            return mockFn;
        };
        mockFn.mockReset = () => {
            mock.calls = [];
            mock.returnValue = undefined;
            mock.implementation = null;
            return mockFn;
        };
        
        return mockFn;
    }

    static spyOn(object, method) {
        const original = object[method];
        const mock = Mock.fn(original);
        object[method] = mock;
        
        mock.mockRestore = () => {
            object[method] = original;
        };
        
        return mock;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestFramework, Assert, Mock };
} else {
    window.TestFramework = TestFramework;
    window.Assert = Assert;
    window.Mock = Mock;
}
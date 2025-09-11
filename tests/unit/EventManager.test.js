/**
 * Unit Tests for EventManager
 */

const { TestFramework, Assert, Mock } = require('../TestFramework');

const test = new TestFramework();

test.describe('EventManager', () => {
    let eventManager;
    let testElement;
    
    test.beforeEach(() => {
        eventManager = new EventManager();
        testElement = document.createElement('div');
        document.body.appendChild(testElement);
    });
    
    test.afterEach(() => {
        if (eventManager && eventManager.destroy) {
            eventManager.destroy();
        }
        if (testElement && testElement.parentNode) {
            testElement.parentNode.removeChild(testElement);
        }
    });
    
    test.it('should register event listeners', () => {
        const handler = Mock.fn();
        
        eventManager.on(testElement, 'click', handler);
        
        const event = new Event('click');
        testElement.dispatchEvent(event);
        
        Assert.equal(handler.mock.calls.length, 1);
    });
    
    test.it('should remove event listeners', () => {
        const handler = Mock.fn();
        
        eventManager.on(testElement, 'click', handler);
        eventManager.off(testElement, 'click', handler);
        
        const event = new Event('click');
        testElement.dispatchEvent(event);
        
        Assert.equal(handler.mock.calls.length, 0);
    });
    
    test.it('should handle multiple listeners for same event', () => {
        const handler1 = Mock.fn();
        const handler2 = Mock.fn();
        
        eventManager.on(testElement, 'click', handler1);
        eventManager.on(testElement, 'click', handler2);
        
        const event = new Event('click');
        testElement.dispatchEvent(event);
        
        Assert.equal(handler1.mock.calls.length, 1);
        Assert.equal(handler2.mock.calls.length, 1);
    });
    
    test.it('should support event delegation', () => {
        const handler = Mock.fn();
        const child = document.createElement('button');
        child.className = 'test-button';
        testElement.appendChild(child);
        
        eventManager.delegate(testElement, 'click', '.test-button', handler);
        
        const event = new Event('click', { bubbles: true });
        child.dispatchEvent(event);
        
        Assert.equal(handler.mock.calls.length, 1);
    });
    
    test.it('should prevent duplicate listeners', () => {
        const handler = Mock.fn();
        
        eventManager.on(testElement, 'click', handler);
        eventManager.on(testElement, 'click', handler); // Duplicate
        
        const event = new Event('click');
        testElement.dispatchEvent(event);
        
        // Should only be called once
        Assert.equal(handler.mock.calls.length, 1);
    });
    
    test.it('should support once listeners', () => {
        const handler = Mock.fn();
        
        eventManager.once(testElement, 'click', handler);
        
        const event = new Event('click');
        testElement.dispatchEvent(event);
        testElement.dispatchEvent(event);
        
        // Should only be called once
        Assert.equal(handler.mock.calls.length, 1);
    });
    
    test.it('should track listener count', () => {
        const handler1 = Mock.fn();
        const handler2 = Mock.fn();
        
        eventManager.on(testElement, 'click', handler1);
        eventManager.on(testElement, 'click', handler2);
        
        const count = eventManager.getListenerCount(testElement, 'click');
        Assert.equal(count, 2);
    });
    
    test.it('should enforce maximum listener limit', () => {
        eventManager.setMaxListeners(5);
        
        for (let i = 0; i < 5; i++) {
            eventManager.on(testElement, 'click', () => {});
        }
        
        Assert.throws(() => {
            eventManager.on(testElement, 'click', () => {});
        }, Error);
    });
    
    test.it('should clean up listeners when element is removed', () => {
        const handler = Mock.fn();
        const tempElement = document.createElement('div');
        document.body.appendChild(tempElement);
        
        eventManager.on(tempElement, 'click', handler);
        eventManager.cleanupElement(tempElement);
        
        const event = new Event('click');
        tempElement.dispatchEvent(event);
        
        Assert.equal(handler.mock.calls.length, 0);
        
        if (tempElement.parentNode) {
            tempElement.parentNode.removeChild(tempElement);
        }
    });
    
    test.it('should support custom events', () => {
        const handler = Mock.fn();
        
        eventManager.on(testElement, 'customEvent', handler);
        
        const event = new CustomEvent('customEvent', { detail: { test: 'data' } });
        testElement.dispatchEvent(event);
        
        Assert.equal(handler.mock.calls.length, 1);
        Assert.equal(handler.mock.calls[0][0].detail.test, 'data');
    });
    
    test.it('should handle event namespaces', () => {
        const handler1 = Mock.fn();
        const handler2 = Mock.fn();
        
        eventManager.on(testElement, 'click.namespace1', handler1);
        eventManager.on(testElement, 'click.namespace2', handler2);
        
        // Remove only namespace1
        eventManager.off(testElement, 'click.namespace1');
        
        const event = new Event('click');
        testElement.dispatchEvent(event);
        
        Assert.equal(handler1.mock.calls.length, 0);
        Assert.equal(handler2.mock.calls.length, 1);
    });
    
    test.it('should support passive listeners', () => {
        const handler = Mock.fn();
        
        eventManager.on(testElement, 'scroll', handler, { passive: true });
        
        const event = new Event('scroll');
        testElement.dispatchEvent(event);
        
        Assert.equal(handler.mock.calls.length, 1);
    });
    
    test.it('should throttle event handlers', () => {
        const handler = Mock.fn();
        const throttledHandler = eventManager.throttle(handler, 100);
        
        eventManager.on(testElement, 'scroll', throttledHandler);
        
        // Fire multiple events quickly
        for (let i = 0; i < 10; i++) {
            const event = new Event('scroll');
            testElement.dispatchEvent(event);
        }
        
        // Should only be called once due to throttling
        Assert.equal(handler.mock.calls.length, 1);
    });
    
    test.it('should debounce event handlers', async () => {
        const handler = Mock.fn();
        const debouncedHandler = eventManager.debounce(handler, 50);
        
        eventManager.on(testElement, 'input', debouncedHandler);
        
        // Fire multiple events quickly
        for (let i = 0; i < 5; i++) {
            const event = new Event('input');
            testElement.dispatchEvent(event);
        }
        
        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Should only be called once after debounce period
        Assert.equal(handler.mock.calls.length, 1);
    });
    
    test.it('should emit custom events', () => {
        const handler = Mock.fn();
        
        eventManager.on(testElement, 'customEmit', handler);
        eventManager.emit(testElement, 'customEmit', { data: 'test' });
        
        Assert.equal(handler.mock.calls.length, 1);
        Assert.equal(handler.mock.calls[0][0].detail.data, 'test');
    });
    
    test.it('should clear all listeners on destroy', () => {
        const handler1 = Mock.fn();
        const handler2 = Mock.fn();
        
        eventManager.on(testElement, 'click', handler1);
        eventManager.on(testElement, 'keydown', handler2);
        
        eventManager.destroy();
        
        const clickEvent = new Event('click');
        const keyEvent = new Event('keydown');
        
        testElement.dispatchEvent(clickEvent);
        testElement.dispatchEvent(keyEvent);
        
        Assert.equal(handler1.mock.calls.length, 0);
        Assert.equal(handler2.mock.calls.length, 0);
    });
    
    test.it('should track memory usage', () => {
        const initialMemory = eventManager.getMemoryUsage();
        
        for (let i = 0; i < 100; i++) {
            eventManager.on(testElement, `event${i}`, () => {});
        }
        
        const finalMemory = eventManager.getMemoryUsage();
        Assert.greaterThan(finalMemory.listenerCount, initialMemory.listenerCount);
    });
    
    test.it('should support WeakMap for element tracking', () => {
        const weakElement = document.createElement('div');
        const handler = Mock.fn();
        
        eventManager.on(weakElement, 'click', handler);
        
        // Element should be tracked in WeakMap
        Assert.isTrue(eventManager.hasListeners(weakElement));
        
        // Simulate element going out of scope
        eventManager.cleanupElement(weakElement);
        Assert.isFalse(eventManager.hasListeners(weakElement));
    });
});

// Export test suite
if (typeof module !== 'undefined' && module.exports) {
    module.exports = test;
}
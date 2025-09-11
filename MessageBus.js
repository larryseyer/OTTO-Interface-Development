/**
 * MessageBus - JUCE-ready publish/subscribe messaging system
 * Maps to JUCE's MessageManager and ActionBroadcaster patterns
 */
class MessageBus {
    constructor() {
        this.subscribers = new Map();
        this.messageQueue = [];
        this.messageHistory = [];
        this.maxHistorySize = 100;
        this.processing = false;
        this.priorities = {
            HIGH: 3,
            NORMAL: 2,
            LOW: 1
        };
    }

    /**
     * Subscribe to a message type
     * @param {string} messageType - Type of message to listen for
     * @param {Function} callback - Handler function
     * @param {Object} options - Subscription options
     * @returns {string} Subscription ID for unsubscribing
     */
    subscribe(messageType, callback, options = {}) {
        const {
            priority = this.priorities.NORMAL,
            once = false,
            filter = null
        } = options;

        if (!this.subscribers.has(messageType)) {
            this.subscribers.set(messageType, []);
        }

        const subscriptionId = `${messageType}_${Date.now()}_${Math.random()}`;
        const subscription = {
            id: subscriptionId,
            callback,
            priority,
            once,
            filter
        };

        const subscriptions = this.subscribers.get(messageType);
        subscriptions.push(subscription);
        
        // Sort by priority
        subscriptions.sort((a, b) => b.priority - a.priority);

        return subscriptionId;
    }

    /**
     * Unsubscribe from messages
     * @param {string} subscriptionId - ID returned from subscribe
     */
    unsubscribe(subscriptionId) {
        for (const [messageType, subscriptions] of this.subscribers) {
            const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
            if (index !== -1) {
                subscriptions.splice(index, 1);
                if (subscriptions.length === 0) {
                    this.subscribers.delete(messageType);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Publish a message
     * @param {string} messageType - Type of message
     * @param {*} data - Message payload
     * @param {Object} options - Publishing options
     */
    publish(messageType, data, options = {}) {
        const {
            async = false,
            priority = this.priorities.NORMAL,
            delay = 0
        } = options;

        const message = {
            type: messageType,
            data,
            timestamp: Date.now(),
            priority,
            id: `msg_${Date.now()}_${Math.random()}`
        };

        if (delay > 0) {
            setTimeout(() => this.publishMessage(message, async), delay);
        } else if (async) {
            this.queueMessage(message);
        } else {
            this.publishMessage(message, false);
        }

        this.addToHistory(message);
    }

    /**
     * Queue a message for async processing
     * @private
     */
    queueMessage(message) {
        this.messageQueue.push(message);
        this.messageQueue.sort((a, b) => b.priority - a.priority);
        
        if (!this.processing) {
            this.processQueue();
        }
    }

    /**
     * Process queued messages
     * @private
     */
    async processQueue() {
        if (this.processing || this.messageQueue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    this.publishMessage(message, false);
                    resolve();
                });
            });
        }

        this.processing = false;
    }

    /**
     * Actually publish a message to subscribers
     * @private
     */
    publishMessage(message, async) {
        const subscriptions = this.subscribers.get(message.type) || [];
        const toRemove = [];

        for (const subscription of subscriptions) {
            // Apply filter if present
            if (subscription.filter && !subscription.filter(message.data)) {
                continue;
            }

            try {
                if (async) {
                    Promise.resolve().then(() => subscription.callback(message.data, message));
                } else {
                    subscription.callback(message.data, message);
                }

                if (subscription.once) {
                    toRemove.push(subscription.id);
                }
            } catch (error) {
                console.error(`Error in message handler for ${message.type}:`, error);
                this.publish('message-bus:error', {
                    originalMessage: message,
                    error: error.message
                });
            }
        }

        // Remove one-time subscriptions
        toRemove.forEach(id => this.unsubscribe(id));
    }

    /**
     * Add message to history
     * @private
     */
    addToHistory(message) {
        this.messageHistory.push(message);
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory.shift();
        }
    }

    /**
     * Get message history
     * @param {string} messageType - Optional filter by type
     * @returns {Array} Message history
     */
    getHistory(messageType = null) {
        if (messageType) {
            return this.messageHistory.filter(msg => msg.type === messageType);
        }
        return [...this.messageHistory];
    }

    /**
     * Clear all subscriptions for a message type
     * @param {string} messageType - Type to clear
     */
    clearSubscriptions(messageType = null) {
        if (messageType) {
            this.subscribers.delete(messageType);
        } else {
            this.subscribers.clear();
        }
    }

    /**
     * Get subscription count
     * @param {string} messageType - Optional type filter
     * @returns {number} Number of subscriptions
     */
    getSubscriptionCount(messageType = null) {
        if (messageType) {
            return (this.subscribers.get(messageType) || []).length;
        }
        
        let count = 0;
        for (const subscriptions of this.subscribers.values()) {
            count += subscriptions.length;
        }
        return count;
    }

    /**
     * Create a typed message channel
     * @param {string} channelName - Name of the channel
     * @returns {Object} Channel interface
     */
    createChannel(channelName) {
        return {
            send: (data, options) => this.publish(channelName, data, options),
            subscribe: (callback, options) => this.subscribe(channelName, callback, options),
            unsubscribe: (id) => this.unsubscribe(id),
            clear: () => this.clearSubscriptions(channelName)
        };
    }

    /**
     * Destroy the message bus
     */
    destroy() {
        this.subscribers.clear();
        this.messageQueue = [];
        this.messageHistory = [];
        this.processing = false;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageBus;
}
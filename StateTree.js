/**
 * StateTree - JUCE-ready hierarchical state management
 * Maps to JUCE's ValueTree system
 */

class StateNode {
    constructor(type, id = null, properties = {}) {
        this.type = type;
        this.id = id || `${type}_${Date.now()}_${Math.random()}`;
        this.properties = new Map(Object.entries(properties));
        this.children = [];
        this.parent = null;
        this.listeners = new Set();
        this.version = 0;
    }

    /**
     * Set a property value
     * @param {string} key - Property key
     * @param {*} value - Property value
     * @param {boolean} notify - Whether to notify listeners
     */
    setProperty(key, value, notify = true) {
        const oldValue = this.properties.get(key);
        
        if (oldValue !== value) {
            this.properties.set(key, value);
            this.version++;
            
            if (notify) {
                this.notifyListeners('property-changed', {
                    key,
                    oldValue,
                    newValue: value
                });
            }
        }
    }

    /**
     * Get a property value
     * @param {string} key - Property key
     * @param {*} defaultValue - Default if not found
     * @returns {*} Property value
     */
    getProperty(key, defaultValue = undefined) {
        return this.properties.has(key) ? this.properties.get(key) : defaultValue;
    }

    /**
     * Remove a property
     * @param {string} key - Property key
     * @param {boolean} notify - Whether to notify listeners
     */
    removeProperty(key, notify = true) {
        if (this.properties.has(key)) {
            const oldValue = this.properties.get(key);
            this.properties.delete(key);
            this.version++;
            
            if (notify) {
                this.notifyListeners('property-removed', {
                    key,
                    oldValue
                });
            }
        }
    }

    /**
     * Add a child node
     * @param {StateNode} child - Child node
     * @param {number} index - Optional insertion index
     */
    addChild(child, index = -1) {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        
        child.parent = this;
        
        if (index >= 0 && index < this.children.length) {
            this.children.splice(index, 0, child);
        } else {
            this.children.push(child);
        }
        
        this.version++;
        this.notifyListeners('child-added', { child, index });
    }

    /**
     * Remove a child node
     * @param {StateNode} child - Child to remove
     * @returns {boolean} Success
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
            this.version++;
            this.notifyListeners('child-removed', { child, index });
            return true;
        }
        return false;
    }

    /**
     * Remove all children
     */
    removeAllChildren() {
        const children = [...this.children];
        for (const child of children) {
            this.removeChild(child);
        }
    }

    /**
     * Get child by index
     * @param {number} index - Child index
     * @returns {StateNode|null} Child node
     */
    getChild(index) {
        return this.children[index] || null;
    }

    /**
     * Get child by ID (searches recursively)
     * @param {string} id - Child ID
     * @returns {StateNode|null} Child node
     */
    getChildById(id) {
        for (const child of this.children) {
            if (child.id === id) {
                return child;
            }
            const found = child.getChildById(id);
            if (found) return found;
        }
        return null;
    }

    /**
     * Get children by type
     * @param {string} type - Node type
     * @returns {Array} Matching children
     */
    getChildrenByType(type) {
        return this.children.filter(child => child.type === type);
    }

    /**
     * Find nodes matching predicate (recursive)
     * @param {Function} predicate - Test function
     * @returns {Array} Matching nodes
     */
    findNodes(predicate) {
        const results = [];
        
        if (predicate(this)) {
            results.push(this);
        }
        
        for (const child of this.children) {
            results.push(...child.findNodes(predicate));
        }
        
        return results;
    }

    /**
     * Get path to root
     * @returns {Array} Path of nodes from root to this
     */
    getPath() {
        const path = [];
        let node = this;
        
        while (node) {
            path.unshift(node);
            node = node.parent;
        }
        
        return path;
    }

    /**
     * Create a deep copy
     * @returns {StateNode} Cloned node
     */
    clone() {
        const cloned = new StateNode(this.type, null, Object.fromEntries(this.properties));
        
        for (const child of this.children) {
            cloned.addChild(child.clone());
        }
        
        return cloned;
    }

    /**
     * Serialize to JSON
     * @returns {Object} Serialized node
     */
    toJSON() {
        return {
            type: this.type,
            id: this.id,
            properties: Object.fromEntries(this.properties),
            children: this.children.map(child => child.toJSON())
        };
    }

    /**
     * Deserialize from JSON
     * @param {Object} json - Serialized node
     * @returns {StateNode} Deserialized node
     */
    static fromJSON(json) {
        const node = new StateNode(json.type, json.id, json.properties || {});
        
        if (json.children) {
            for (const childJSON of json.children) {
                node.addChild(StateNode.fromJSON(childJSON));
            }
        }
        
        return node;
    }

    /**
     * Add listener
     * @param {Function} callback - Listener function
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Remove listener
     * @param {Function} callback - Listener function
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notify listeners
     * @private
     */
    notifyListeners(event, data) {
        for (const listener of this.listeners) {
            try {
                listener(event, data, this);
            } catch (error) {
                console.error('StateNode listener error:', error);
            }
        }
        
        // Bubble up to parent
        if (this.parent) {
            this.parent.notifyListeners('descendant-changed', {
                node: this,
                event,
                data
            });
        }
    }
}

/**
 * StateTree - Root state management
 */
class StateTree {
    constructor(type = 'root') {
        this.root = new StateNode(type);
        this.transactionStack = [];
        this.listeners = new Set();
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoLevels = 50;
    }

    /**
     * Begin atomic transaction
     */
    beginTransaction() {
        this.transactionStack.push({
            changes: [],
            timestamp: Date.now()
        });
    }

    /**
     * Commit transaction
     */
    commitTransaction() {
        if (this.transactionStack.length === 0) {
            console.warn('No transaction to commit');
            return;
        }
        
        const transaction = this.transactionStack.pop();
        
        if (transaction.changes.length > 0) {
            // Add to undo stack
            this.undoStack.push(transaction);
            if (this.undoStack.length > this.maxUndoLevels) {
                this.undoStack.shift();
            }
            
            // Clear redo stack
            this.redoStack = [];
            
            this.notifyListeners('transaction-committed', transaction);
        }
    }

    /**
     * Rollback transaction
     */
    rollbackTransaction() {
        if (this.transactionStack.length === 0) {
            console.warn('No transaction to rollback');
            return;
        }
        
        const transaction = this.transactionStack.pop();
        
        // Undo changes in reverse order
        for (let i = transaction.changes.length - 1; i >= 0; i--) {
            this.applyChange(transaction.changes[i], true);
        }
        
        this.notifyListeners('transaction-rolled-back', transaction);
    }

    /**
     * Record a change (for undo/redo)
     * @private
     */
    recordChange(change) {
        if (this.transactionStack.length > 0) {
            this.transactionStack[this.transactionStack.length - 1].changes.push(change);
        }
    }

    /**
     * Apply a change (for undo/redo)
     * @private
     */
    applyChange(change, reverse = false) {
        // Implementation depends on change type
        // This is a simplified version
        switch (change.type) {
            case 'property-set':
                if (reverse) {
                    change.node.setProperty(change.key, change.oldValue, false);
                } else {
                    change.node.setProperty(change.key, change.newValue, false);
                }
                break;
            case 'child-add':
                if (reverse) {
                    change.parent.removeChild(change.child);
                } else {
                    change.parent.addChild(change.child, change.index);
                }
                break;
            case 'child-remove':
                if (reverse) {
                    change.parent.addChild(change.child, change.index);
                } else {
                    change.parent.removeChild(change.child);
                }
                break;
        }
    }

    /**
     * Get root node
     * @returns {StateNode} Root node
     */
    getRoot() {
        return this.root;
    }

    /**
     * Find node by ID
     * @param {string} id - Node ID
     * @returns {StateNode|null} Found node
     */
    findNodeById(id) {
        return this.root.getChildById(id);
    }

    /**
     * Find nodes by type
     * @param {string} type - Node type
     * @returns {Array} Matching nodes
     */
    findNodesByType(type) {
        return this.root.findNodes(node => node.type === type);
    }

    /**
     * Create diff between two trees
     * @param {StateTree} other - Other tree
     * @returns {Object} Diff object
     */
    diff(other) {
        return this.diffNodes(this.root, other.root);
    }

    /**
     * Diff two nodes recursively
     * @private
     */
    diffNodes(node1, node2) {
        const diff = {
            type: 'diff',
            changes: []
        };

        // Compare properties
        for (const [key, value] of node1.properties) {
            const otherValue = node2.properties.get(key);
            if (otherValue !== value) {
                diff.changes.push({
                    type: 'property-changed',
                    path: node1.getPath().map(n => n.id),
                    key,
                    oldValue: value,
                    newValue: otherValue
                });
            }
        }

        // Check for new properties in node2
        for (const [key, value] of node2.properties) {
            if (!node1.properties.has(key)) {
                diff.changes.push({
                    type: 'property-added',
                    path: node1.getPath().map(n => n.id),
                    key,
                    value
                });
            }
        }

        // Compare children
        // This is simplified - a real implementation would be more sophisticated
        if (node1.children.length !== node2.children.length) {
            diff.changes.push({
                type: 'children-changed',
                path: node1.getPath().map(n => n.id),
                oldCount: node1.children.length,
                newCount: node2.children.length
            });
        }

        return diff;
    }

    /**
     * Apply a diff to this tree
     * @param {Object} diff - Diff object
     */
    applyDiff(diff) {
        this.beginTransaction();
        
        for (const change of diff.changes) {
            // Apply each change
            // Implementation would depend on change types
        }
        
        this.commitTransaction();
    }

    /**
     * Serialize entire tree
     * @returns {Object} Serialized tree
     */
    serialize() {
        return {
            version: '1.0',
            root: this.root.toJSON()
        };
    }

    /**
     * Deserialize entire tree
     * @param {Object} data - Serialized tree
     */
    deserialize(data) {
        this.root = StateNode.fromJSON(data.root);
        this.undoStack = [];
        this.redoStack = [];
        this.notifyListeners('tree-loaded', data);
    }

    /**
     * Add tree listener
     * @param {Function} callback - Listener function
     */
    addListener(callback) {
        this.listeners.add(callback);
        this.root.addListener((event, data, node) => {
            callback('node-event', { event, data, node });
        });
    }

    /**
     * Remove tree listener
     * @param {Function} callback - Listener function
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notify listeners
     * @private
     */
    notifyListeners(event, data) {
        for (const listener of this.listeners) {
            try {
                listener(event, data);
            } catch (error) {
                console.error('StateTree listener error:', error);
            }
        }
    }

    /**
     * Clear entire tree
     */
    clear() {
        this.root.removeAllChildren();
        this.root.properties.clear();
        this.undoStack = [];
        this.redoStack = [];
        this.notifyListeners('tree-cleared');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StateNode, StateTree };
}
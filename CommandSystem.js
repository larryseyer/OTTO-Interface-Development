/**
 * Command System - JUCE-ready command pattern with undo/redo
 * Maps to JUCE's UndoableAction and UndoManager
 */

/**
 * Base Command class
 */
class Command {
    constructor(name = 'Unnamed Command') {
        this.name = name;
        this.timestamp = Date.now();
        this.id = `cmd_${this.timestamp}_${Math.random()}`;
    }

    /**
     * Execute the command
     * @returns {boolean} Success status
     */
    execute() {
        throw new Error('Command.execute() must be implemented');
    }

    /**
     * Undo the command
     * @returns {boolean} Success status
     */
    undo() {
        throw new Error('Command.undo() must be implemented');
    }

    /**
     * Redo the command (default implementation calls execute)
     * @returns {boolean} Success status
     */
    redo() {
        return this.execute();
    }

    /**
     * Check if command can be executed
     * @returns {boolean} Can execute
     */
    canExecute() {
        return true;
    }

    /**
     * Check if command can be undone
     * @returns {boolean} Can undo
     */
    canUndo() {
        return true;
    }

    /**
     * Get command description
     * @returns {string} Description
     */
    getDescription() {
        return this.name;
    }

    /**
     * Check if this command can be merged with another
     * @param {Command} other - Other command
     * @returns {boolean} Can merge
     */
    canMergeWith(other) {
        return false;
    }

    /**
     * Merge with another command
     * @param {Command} other - Other command
     * @returns {boolean} Merge success
     */
    mergeWith(other) {
        return false;
    }
}

/**
 * Macro Command - Executes multiple commands as one
 */
class MacroCommand extends Command {
    constructor(name = 'Macro Command') {
        super(name);
        this.commands = [];
    }

    /**
     * Add a command to the macro
     * @param {Command} command - Command to add
     */
    addCommand(command) {
        this.commands.push(command);
    }

    execute() {
        for (const command of this.commands) {
            if (!command.execute()) {
                // Rollback on failure
                this.undoPartial(this.commands.indexOf(command));
                return false;
            }
        }
        return true;
    }

    undo() {
        // Undo in reverse order
        for (let i = this.commands.length - 1; i >= 0; i--) {
            if (!this.commands[i].undo()) {
                return false;
            }
        }
        return true;
    }

    /**
     * Undo partially executed macro
     * @private
     */
    undoPartial(failedIndex) {
        for (let i = failedIndex - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }

    canExecute() {
        return this.commands.every(cmd => cmd.canExecute());
    }

    canUndo() {
        return this.commands.every(cmd => cmd.canUndo());
    }

    getDescription() {
        if (this.commands.length === 0) return this.name;
        if (this.commands.length === 1) return this.commands[0].getDescription();
        return `${this.name} (${this.commands.length} actions)`;
    }
}

/**
 * Command Manager - Manages command history and undo/redo
 */
class CommandManager {
    constructor(options = {}) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = options.maxHistorySize || 100;
        this.currentTransaction = null;
        this.listeners = new Set();
        this.commandHistory = [];
        this.mergeWindow = options.mergeWindow || 500; // ms
    }

    /**
     * Execute a command
     * @param {Command} command - Command to execute
     * @returns {boolean} Success status
     */
    execute(command) {
        if (!command.canExecute()) {
            console.warn(`Command cannot be executed: ${command.getDescription()}`);
            return false;
        }

        // Try to merge with last command
        if (this.undoStack.length > 0) {
            const lastCommand = this.undoStack[this.undoStack.length - 1];
            const timeDiff = command.timestamp - lastCommand.timestamp;
            
            if (timeDiff < this.mergeWindow && lastCommand.canMergeWith(command)) {
                if (lastCommand.mergeWith(command)) {
                    this.notifyListeners('command-merged', lastCommand);
                    return true;
                }
            }
        }

        // Execute the command
        const success = command.execute();
        
        if (success) {
            // Add to current transaction or undo stack
            if (this.currentTransaction) {
                this.currentTransaction.addCommand(command);
            } else {
                this.undoStack.push(command);
                this.enforceHistoryLimit();
            }
            
            // Clear redo stack on new command
            this.redoStack = [];
            
            // Add to history
            this.commandHistory.push({
                command,
                timestamp: Date.now(),
                type: 'execute'
            });
            
            this.notifyListeners('command-executed', command);
        }
        
        return success;
    }

    /**
     * Undo the last command
     * @returns {boolean} Success status
     */
    undo() {
        if (!this.canUndo()) {
            return false;
        }

        const command = this.undoStack.pop();
        const success = command.undo();
        
        if (success) {
            this.redoStack.push(command);
            
            this.commandHistory.push({
                command,
                timestamp: Date.now(),
                type: 'undo'
            });
            
            this.notifyListeners('command-undone', command);
        } else {
            // Put it back if undo failed
            this.undoStack.push(command);
        }
        
        return success;
    }

    /**
     * Redo the last undone command
     * @returns {boolean} Success status
     */
    redo() {
        if (!this.canRedo()) {
            return false;
        }

        const command = this.redoStack.pop();
        const success = command.redo();
        
        if (success) {
            this.undoStack.push(command);
            
            this.commandHistory.push({
                command,
                timestamp: Date.now(),
                type: 'redo'
            });
            
            this.notifyListeners('command-redone', command);
        } else {
            // Put it back if redo failed
            this.redoStack.push(command);
        }
        
        return success;
    }

    /**
     * Begin a transaction (groups commands)
     * @param {string} name - Transaction name
     */
    beginTransaction(name = 'Transaction') {
        if (this.currentTransaction) {
            console.warn('Transaction already in progress');
            return false;
        }
        
        this.currentTransaction = new MacroCommand(name);
        this.notifyListeners('transaction-begin', this.currentTransaction);
        return true;
    }

    /**
     * Commit the current transaction
     */
    commitTransaction() {
        if (!this.currentTransaction) {
            console.warn('No transaction to commit');
            return false;
        }
        
        const transaction = this.currentTransaction;
        this.currentTransaction = null;
        
        if (transaction.commands.length > 0) {
            this.undoStack.push(transaction);
            this.enforceHistoryLimit();
            this.redoStack = [];
            
            this.notifyListeners('transaction-commit', transaction);
        }
        
        return true;
    }

    /**
     * Rollback the current transaction
     */
    rollbackTransaction() {
        if (!this.currentTransaction) {
            console.warn('No transaction to rollback');
            return false;
        }
        
        const transaction = this.currentTransaction;
        this.currentTransaction = null;
        
        // Undo all commands in the transaction
        transaction.undo();
        
        this.notifyListeners('transaction-rollback', transaction);
        return true;
    }

    /**
     * Check if can undo
     * @returns {boolean} Can undo
     */
    canUndo() {
        return this.undoStack.length > 0 && 
               this.undoStack[this.undoStack.length - 1].canUndo();
    }

    /**
     * Check if can redo
     * @returns {boolean} Can redo
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Get undo description
     * @returns {string} Description or null
     */
    getUndoDescription() {
        if (!this.canUndo()) return null;
        return this.undoStack[this.undoStack.length - 1].getDescription();
    }

    /**
     * Get redo description
     * @returns {string} Description or null
     */
    getRedoDescription() {
        if (!this.canRedo()) return null;
        return this.redoStack[this.redoStack.length - 1].getDescription();
    }

    /**
     * Clear all history
     */
    clearHistory() {
        this.undoStack = [];
        this.redoStack = [];
        this.commandHistory = [];
        this.currentTransaction = null;
        this.notifyListeners('history-cleared');
    }

    /**
     * Enforce history size limit
     * @private
     */
    enforceHistoryLimit() {
        while (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
    }

    /**
     * Add listener for command events
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
                listener(event, data);
            } catch (error) {
                console.error('Command listener error:', error);
            }
        }
    }

    /**
     * Get command history
     * @param {number} limit - Max items to return
     * @returns {Array} Command history
     */
    getHistory(limit = 50) {
        return this.commandHistory.slice(-limit);
    }

    /**
     * Save state for persistence
     * @returns {Object} Serialized state
     */
    saveState() {
        return {
            undoStackSize: this.undoStack.length,
            redoStackSize: this.redoStack.length,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            undoDescription: this.getUndoDescription(),
            redoDescription: this.getRedoDescription()
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Command, MacroCommand, CommandManager };
}
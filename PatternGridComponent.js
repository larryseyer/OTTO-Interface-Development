/**
 * PatternGridComponent.js
 * Pattern grid component for 4x4 pattern selection
 * Phase 5 Implementation
 */

class PatternGridComponent extends UIComponent {
  constructor(options = {}) {
    super({
      type: "pattern-grid",
      ...options,
    });

    // Grid configuration
    this.rows = options.rows || 4;
    this.columns = options.columns || 4;
    this.patterns = options.patterns || [];
    this.selectedIndex = options.selectedIndex || 0;

    // Visual configuration
    this.cellSize = options.cellSize || 60;
    this.spacing = options.spacing || 4;
    this.showLabels = options.showLabels !== false;
    this.showPreview = options.showPreview || false;

    // Interaction configuration
    this.allowMultiSelect = options.allowMultiSelect || false;
    this.dragToSelect = options.dragToSelect || false;

    // Callbacks
    this.onSelect = options.onSelect || (() => {});
    this.onPreview = options.onPreview || (() => {});

    // State
    this.selection = new Set();
    this.isDragging = false;
    this.dragStart = null;

    // Grid cells
    this.cells = new Map();

    // Initialize state
    this.state = {
      selectedIndex: this.selectedIndex,
      hoveredIndex: null,
      selection: new Set([this.selectedIndex]),
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Mouse events
    this.addEventListener(this.element, "mousedown", (e) =>
      this.handleMouseDown(e),
    );
    this.addEventListener(document, "mousemove", (e) =>
      this.handleMouseMove(e),
    );
    this.addEventListener(document, "mouseup", (e) => this.handleMouseUp(e));

    // Touch events
    this.addEventListener(this.element, "touchstart", (e) =>
      this.handleTouchStart(e),
    );
    this.addEventListener(document, "touchmove", (e) =>
      this.handleTouchMove(e),
    );
    this.addEventListener(document, "touchend", (e) => this.handleTouchEnd(e));

    // Keyboard navigation
    this.addEventListener(this.element, "keydown", (e) =>
      this.handleKeyDown(e),
    );
  }

  /**
   * Render pattern grid
   */
  render() {
    const gridStyle = `
      grid-template-columns: repeat(${this.columns}, ${this.cellSize}px);
      grid-template-rows: repeat(${this.rows}, ${this.cellSize}px);
      gap: ${this.spacing}px;
    `;

    return `
      <div class="pattern-grid-container" tabindex="0" role="grid">
        <div class="pattern-grid" style="${gridStyle}">
          ${this.renderCells()}
        </div>
        ${this.showPreview ? this.renderPreview() : ""}
      </div>
    `;
  }

  /**
   * Render grid cells
   */
  renderCells() {
    const cells = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const index = row * this.columns + col;
        const pattern = this.patterns[index];
        const isSelected = this.state.selection.has(index);
        const isHovered = this.state.hoveredIndex === index;

        cells.push(this.renderCell(index, pattern, isSelected, isHovered));
      }
    }

    return cells.join("");
  }

  /**
   * Render individual cell
   */
  renderCell(index, pattern, isSelected, isHovered) {
    const row = Math.floor(index / this.columns);
    const col = index % this.columns;

    const classes = [
      "pattern-cell",
      isSelected ? "selected" : "",
      isHovered ? "hovered" : "",
      pattern ? "has-pattern" : "empty",
    ]
      .filter(Boolean)
      .join(" ");

    return `
      <div class="${classes}"
           data-index="${index}"
           data-row="${row}"
           data-col="${col}"
           role="gridcell"
           aria-selected="${isSelected}"
           tabindex="${index === 0 ? 0 : -1}">
        ${pattern ? this.renderPattern(pattern, index) : this.renderEmptyCell(index)}
        ${this.showLabels ? `<div class="pattern-label">${this.getCellLabel(index)}</div>` : ""}
      </div>
    `;
  }

  /**
   * Render pattern content
   */
  renderPattern(pattern, index) {
    if (pattern.thumbnail) {
      return `<img class="pattern-thumbnail" src="${pattern.thumbnail}" alt="${pattern.name}">`;
    }

    // Render pattern visualization
    return `
      <div class="pattern-visualization">
        ${this.renderPatternSteps(pattern)}
      </div>
    `;
  }

  /**
   * Render pattern steps
   */
  renderPatternSteps(pattern) {
    if (!pattern.steps) return "";

    const steps = pattern.steps.slice(0, 16);
    return `
      <div class="pattern-steps">
        ${steps
          .map(
            (active, i) =>
              `<div class="pattern-step ${active ? "active" : ""}"></div>`,
          )
          .join("")}
      </div>
    `;
  }

  /**
   * Render empty cell
   */
  renderEmptyCell(index) {
    return `<div class="pattern-empty">+</div>`;
  }

  /**
   * Get cell label
   */
  getCellLabel(index) {
    const row = Math.floor(index / this.columns);
    const col = index % this.columns;
    return `${String.fromCharCode(65 + row)}${col + 1}`;
  }

  /**
   * Render preview area
   */
  renderPreview() {
    const selected = this.patterns[this.state.selectedIndex];
    if (!selected) return "";

    return `
      <div class="pattern-preview">
        <h4>${selected.name || "Pattern"}</h4>
        <div class="pattern-preview-content">
          ${this.renderPatternSteps(selected)}
        </div>
      </div>
    `;
  }

  /**
   * Handle mouse down
   */
  handleMouseDown(e) {
    const cell = e.target.closest(".pattern-cell");
    if (!cell) return;

    e.preventDefault();
    const index = parseInt(cell.dataset.index);

    if (this.dragToSelect) {
      this.startDragSelection(index, e.shiftKey, e.ctrlKey || e.metaKey);
    } else {
      this.selectCell(index, e.shiftKey, e.ctrlKey || e.metaKey);
    }
  }

  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    const cell = e.target.closest(".pattern-cell");
    if (!cell) return;

    e.preventDefault();
    const index = parseInt(cell.dataset.index);
    this.selectCell(index, false, false);
  }

  /**
   * Start drag selection
   */
  startDragSelection(index, shiftKey, ctrlKey) {
    this.isDragging = true;
    this.dragStart = index;

    if (!ctrlKey && !shiftKey) {
      this.state.selection.clear();
    }

    this.state.selection.add(index);
    this.update();
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(e) {
    const cell = e.target.closest(".pattern-cell");

    if (cell) {
      const index = parseInt(cell.dataset.index);
      this.setState({ hoveredIndex: index });

      if (this.isDragging && this.dragToSelect) {
        this.updateDragSelection(index);
      }
    } else {
      this.setState({ hoveredIndex: null });
    }
  }

  /**
   * Update drag selection
   */
  updateDragSelection(currentIndex) {
    if (this.dragStart === null) return;

    const startRow = Math.floor(this.dragStart / this.columns);
    const startCol = this.dragStart % this.columns;
    const endRow = Math.floor(currentIndex / this.columns);
    const endCol = currentIndex % this.columns;

    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    // Clear and rebuild selection
    this.state.selection.clear();

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const index = row * this.columns + col;
        if (this.patterns[index]) {
          this.state.selection.add(index);
        }
      }
    }

    this.update();
  }

  /**
   * Handle mouse up
   */
  handleMouseUp(e) {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragStart = null;
      this.finalizeSelection();
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    this.handleMouseUp(e);
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyDown(e) {
    const currentIndex = this.state.selectedIndex;
    let newIndex = currentIndex;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        newIndex = Math.max(0, currentIndex - this.columns);
        break;
      case "ArrowDown":
        e.preventDefault();
        newIndex = Math.min(
          this.patterns.length - 1,
          currentIndex + this.columns,
        );
        break;
      case "ArrowLeft":
        e.preventDefault();
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        newIndex = Math.min(this.patterns.length - 1, currentIndex + 1);
        break;
      case " ":
      case "Enter":
        e.preventDefault();
        this.selectCell(currentIndex, e.shiftKey, e.ctrlKey || e.metaKey);
        return;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      this.selectCell(newIndex, e.shiftKey, e.ctrlKey || e.metaKey);
      this.updateFocus(newIndex);
    }
  }

  /**
   * Select cell
   */
  selectCell(index, extend = false, toggle = false) {
    if (!this.patterns[index]) return;

    if (this.allowMultiSelect) {
      if (toggle) {
        // Toggle selection
        if (this.state.selection.has(index)) {
          this.state.selection.delete(index);
        } else {
          this.state.selection.add(index);
        }
      } else if (extend && this.state.selectedIndex !== null) {
        // Extend selection
        this.extendSelection(this.state.selectedIndex, index);
      } else {
        // Single selection
        this.state.selection.clear();
        this.state.selection.add(index);
      }
    } else {
      // Single selection only
      this.state.selection.clear();
      this.state.selection.add(index);
    }

    this.setState({
      selectedIndex: index,
      selection: new Set(this.state.selection),
    });

    this.finalizeSelection();
  }

  /**
   * Extend selection between two indices
   */
  extendSelection(fromIndex, toIndex) {
    const minIndex = Math.min(fromIndex, toIndex);
    const maxIndex = Math.max(fromIndex, toIndex);

    for (let i = minIndex; i <= maxIndex; i++) {
      if (this.patterns[i]) {
        this.state.selection.add(i);
      }
    }
  }

  /**
   * Finalize selection
   */
  finalizeSelection() {
    const selected = Array.from(this.state.selection);

    if (selected.length === 1) {
      this.onSelect(selected[0], this.patterns[selected[0]]);
    } else if (selected.length > 1) {
      const patterns = selected.map((i) => this.patterns[i]);
      this.onSelect(selected, patterns);
    }

    this.emit("select", {
      indices: selected,
      patterns: selected.map((i) => this.patterns[i]),
    });
  }

  /**
   * Update focus
   */
  updateFocus(index) {
    // Update tabindex for keyboard navigation
    this.element.querySelectorAll(".pattern-cell").forEach((cell, i) => {
      cell.tabIndex = i === index ? 0 : -1;
    });

    // Focus the cell
    const cell = this.element.querySelector(
      `.pattern-cell[data-index="${index}"]`,
    );
    if (cell) {
      cell.focus();
    }
  }

  /**
   * Set patterns
   */
  setPatterns(patterns) {
    this.patterns = patterns;
    this.update();
  }

  /**
   * Get selected patterns
   */
  getSelected() {
    const indices = Array.from(this.state.selection);
    return {
      indices,
      patterns: indices.map((i) => this.patterns[i]),
    };
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.state.selection.clear();
    this.setState({
      selectedIndex: null,
      selection: new Set(),
    });
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = PatternGridComponent;
}

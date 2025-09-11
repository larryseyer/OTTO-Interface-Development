/**
 * ButtonComponent.js
 * Reusable button components (toggle, momentary, radio groups)
 * Phase 5 Implementation
 */

class ButtonComponent extends UIComponent {
  constructor(options = {}) {
    super({
      type: "button",
      ...options,
    });

    // Button configuration
    this.buttonType = options.buttonType || "momentary"; // momentary, toggle, radio
    this.group = options.group || null;
    this.value = options.value || false;
    this.label = options.label || "";
    this.icon = options.icon || null;
    this.size = options.size || "medium";

    // Visual configuration
    this.color = options.color || null;
    this.shape = options.shape || "rectangle"; // rectangle, circle, rounded
    this.showTooltip = options.showTooltip || false;
    this.tooltipText = options.tooltipText || this.label;

    // State configuration
    this.disabled = options.disabled || false;
    this.selected = options.selected || false;

    // Callbacks
    this.onClick = options.onClick || (() => {});
    this.onToggle = options.onToggle || (() => {});
    this.onSelect = options.onSelect || (() => {});

    // Group management (for radio buttons)
    this.groupManager = null;

    // Initialize state
    this.state = {
      pressed: false,
      toggled: this.value,
      selected: this.selected,
      hover: false,
    };
  }

  /**
   * Get class name for component
   */
  getClassName() {
    const classes = [
      super.getClassName(),
      `button-${this.buttonType}`,
      `button-${this.size}`,
      `button-${this.shape}`,
    ];

    if (this.state.pressed) classes.push("pressed");
    if (this.state.toggled) classes.push("toggled");
    if (this.state.selected) classes.push("selected");
    if (this.disabled) classes.push("disabled");

    return classes.join(" ");
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Mouse events
    this.addEventListener(this.element, "mousedown", (e) =>
      this.handleMouseDown(e),
    );
    this.addEventListener(this.element, "mouseup", (e) =>
      this.handleMouseUp(e),
    );
    this.addEventListener(this.element, "mouseleave", (e) =>
      this.handleMouseLeave(e),
    );
    this.addEventListener(this.element, "mouseenter", (e) =>
      this.handleMouseEnter(e),
    );

    // Touch events
    this.addEventListener(this.element, "touchstart", (e) =>
      this.handleTouchStart(e),
    );
    this.addEventListener(this.element, "touchend", (e) =>
      this.handleTouchEnd(e),
    );

    // Click event
    this.addEventListener(this.element, "click", (e) => this.handleClick(e));

    // Keyboard events
    this.addEventListener(this.element, "keydown", (e) =>
      this.handleKeyDown(e),
    );
    this.addEventListener(this.element, "keyup", (e) => this.handleKeyUp(e));
  }

  /**
   * Render button
   */
  render() {
    const { pressed, toggled, selected, hover } = this.state;
    const ariaPressed = this.buttonType === "toggle" ? toggled : undefined;
    const ariaSelected = this.buttonType === "radio" ? selected : undefined;

    return `
      <button class="${this.getClassName()}"
              role="${this.buttonType === "radio" ? "radio" : "button"}"
              ${ariaPressed !== undefined ? `aria-pressed="${ariaPressed}"` : ""}
              ${ariaSelected !== undefined ? `aria-selected="${ariaSelected}"` : ""}
              ${this.disabled ? "disabled" : ""}
              tabindex="${this.disabled ? -1 : 0}"
              ${this.showTooltip ? `title="${this.tooltipText}"` : ""}>
        <div class="button-content">
          ${this.icon ? `<i class="${this.icon}"></i>` : ""}
          ${this.label ? `<span class="button-label">${this.label}</span>` : ""}
        </div>
        ${this.renderStateIndicator()}
      </button>
    `;
  }

  /**
   * Render state indicator
   */
  renderStateIndicator() {
    if (this.buttonType === "toggle" && this.state.toggled) {
      return '<div class="button-indicator active"></div>';
    } else if (this.buttonType === "radio" && this.state.selected) {
      return '<div class="button-indicator selected"></div>';
    }
    return "";
  }

  /**
   * Handle mouse down
   */
  handleMouseDown(e) {
    if (this.disabled || e.button !== 0) return;

    e.preventDefault();
    this.setState({ pressed: true });

    if (this.buttonType === "momentary") {
      this.onClick(true);
    }
  }

  /**
   * Handle mouse up
   */
  handleMouseUp(e) {
    if (this.disabled) return;

    this.setState({ pressed: false });

    if (this.buttonType === "momentary") {
      this.onClick(false);
    }
  }

  /**
   * Handle mouse enter
   */
  handleMouseEnter(e) {
    if (!this.disabled) {
      this.setState({ hover: true });
    }
  }

  /**
   * Handle mouse leave
   */
  handleMouseLeave(e) {
    this.setState({
      hover: false,
      pressed: false,
    });

    if (this.buttonType === "momentary" && this.state.pressed) {
      this.onClick(false);
    }
  }

  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    if (this.disabled) return;

    e.preventDefault();
    this.setState({ pressed: true });

    if (this.buttonType === "momentary") {
      this.onClick(true);
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    if (this.disabled) return;

    e.preventDefault();
    this.setState({ pressed: false });

    if (this.buttonType === "momentary") {
      this.onClick(false);
    } else {
      this.handleClick(e);
    }
  }

  /**
   * Handle click
   */
  handleClick(e) {
    if (this.disabled) return;

    e.preventDefault();
    e.stopPropagation();

    switch (this.buttonType) {
      case "toggle":
        this.toggle();
        break;
      case "radio":
        this.select();
        break;
      case "momentary":
        // Already handled in mouse/touch events
        break;
      default:
        this.onClick();
    }

    this.emit("click", { value: this.getValue() });
  }

  /**
   * Handle key down
   */
  handleKeyDown(e) {
    if (this.disabled) return;

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      this.setState({ pressed: true });

      if (this.buttonType === "momentary") {
        this.onClick(true);
      }
    }
  }

  /**
   * Handle key up
   */
  handleKeyUp(e) {
    if (this.disabled) return;

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      this.setState({ pressed: false });

      if (this.buttonType === "momentary") {
        this.onClick(false);
      } else {
        this.handleClick(e);
      }
    }
  }

  /**
   * Toggle button state
   */
  toggle() {
    if (this.buttonType !== "toggle") return;

    const newState = !this.state.toggled;
    this.setState({ toggled: newState });
    this.value = newState;

    this.onToggle(newState);
    this.emit("toggle", { value: newState });
  }

  /**
   * Select radio button
   */
  select() {
    if (this.buttonType !== "radio") return;

    // Deselect other buttons in group
    if (this.group && this.parent) {
      this.parent.children.forEach((child) => {
        if (
          child instanceof ButtonComponent &&
          child.group === this.group &&
          child !== this
        ) {
          child.deselect();
        }
      });
    }

    this.setState({ selected: true });
    this.selected = true;

    this.onSelect(this.value || this.label);
    this.emit("select", { value: this.value || this.label });
  }

  /**
   * Deselect radio button
   */
  deselect() {
    if (this.buttonType !== "radio") return;

    this.setState({ selected: false });
    this.selected = false;
  }

  /**
   * Set button value
   */
  setValue(value) {
    switch (this.buttonType) {
      case "toggle":
        this.setState({ toggled: !!value });
        this.value = !!value;
        break;
      case "radio":
        if (value) {
          this.select();
        } else {
          this.deselect();
        }
        break;
    }
  }

  /**
   * Get button value
   */
  getValue() {
    switch (this.buttonType) {
      case "toggle":
        return this.state.toggled;
      case "radio":
        return this.state.selected ? this.value || this.label : null;
      default:
        return this.value;
    }
  }

  /**
   * Enable button
   */
  enable() {
    this.disabled = false;
    this.element.querySelector("button").disabled = false;
    this.element.classList.remove("disabled");
  }

  /**
   * Disable button
   */
  disable() {
    this.disabled = true;
    this.element.querySelector("button").disabled = true;
    this.element.classList.add("disabled");
    this.setState({ pressed: false, hover: false });
  }

  /**
   * Update button appearance
   */
  updateAppearance(options) {
    if (options.label !== undefined) {
      this.label = options.label;
    }
    if (options.icon !== undefined) {
      this.icon = options.icon;
    }
    if (options.color !== undefined) {
      this.color = options.color;
    }

    this.update();
  }
}

/**
 * Button group component for managing related buttons
 */
class ButtonGroupComponent extends UIComponent {
  constructor(options = {}) {
    super({
      type: "button-group",
      ...options,
    });

    // Group configuration
    this.groupType = options.groupType || "toggle"; // toggle, radio, action
    this.layout = options.layout || "horizontal"; // horizontal, vertical, grid
    this.buttons = options.buttons || [];
    this.allowMultiple = options.allowMultiple || false;

    // Callbacks
    this.onChange = options.onChange || (() => {});

    // Button components
    this.buttonComponents = new Map();

    // Current selection
    this.selection = new Set();
  }

  /**
   * Initialize children
   */
  initializeChildren() {
    this.buttons.forEach((buttonConfig, index) => {
      const button = new ButtonComponent({
        ...buttonConfig,
        buttonType:
          this.groupType === "radio" ? "radio" : buttonConfig.buttonType,
        group: this.groupType === "radio" ? this.id : buttonConfig.group,
        onClick: (value) => this.handleButtonClick(index, value),
        onToggle: (value) => this.handleButtonToggle(index, value),
        onSelect: (value) => this.handleButtonSelect(index, value),
      });

      this.buttonComponents.set(index, button);
      this.addChild(button);
    });
  }

  /**
   * Render button group
   */
  render() {
    return `
      <div class="button-group-container button-group-${this.layout}">
        ${this.buttons
          .map(
            (_, index) =>
              `<div class="button-group-item" data-index="${index}"></div>`,
          )
          .join("")}
      </div>
    `;
  }

  /**
   * Handle button click
   */
  handleButtonClick(index, value) {
    this.emit("button-click", { index, value });
  }

  /**
   * Handle button toggle
   */
  handleButtonToggle(index, value) {
    if (value) {
      this.selection.add(index);
    } else {
      this.selection.delete(index);
    }

    this.onChange(Array.from(this.selection));
    this.emit("change", { selection: Array.from(this.selection) });
  }

  /**
   * Handle button select (radio)
   */
  handleButtonSelect(index, value) {
    // Clear previous selection
    this.selection.clear();
    this.selection.add(index);

    // Deselect other buttons
    this.buttonComponents.forEach((button, i) => {
      if (i !== index && button.buttonType === "radio") {
        button.deselect();
      }
    });

    this.onChange(index);
    this.emit("change", { selection: index, value });
  }

  /**
   * Get selected values
   */
  getSelection() {
    if (this.groupType === "radio") {
      return this.selection.size > 0
        ? this.selection.values().next().value
        : null;
    }
    return Array.from(this.selection);
  }

  /**
   * Set selection
   */
  setSelection(indices) {
    this.selection.clear();

    if (this.groupType === "radio") {
      const index = Array.isArray(indices) ? indices[0] : indices;
      if (index !== null && index !== undefined) {
        this.selection.add(index);
        this.buttonComponents.get(index)?.select();
      }
    } else {
      const indexArray = Array.isArray(indices) ? indices : [indices];
      indexArray.forEach((index) => {
        this.selection.add(index);
        this.buttonComponents.get(index)?.setValue(true);
      });
    }
  }

  /**
   * Enable all buttons
   */
  enableAll() {
    this.buttonComponents.forEach((button) => button.enable());
  }

  /**
   * Disable all buttons
   */
  disableAll() {
    this.buttonComponents.forEach((button) => button.disable());
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ButtonComponent, ButtonGroupComponent };
}

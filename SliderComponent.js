/**
 * SliderComponent.js
 * Reusable slider component for OTTO interface
 * Phase 5 Implementation
 */

class SliderComponent extends UIComponent {
  constructor(options = {}) {
    super({
      type: 'slider',
      ...options
    });
    
    // Slider configuration
    this.min = options.min || 0;
    this.max = options.max || 100;
    this.value = options.value || 50;
    this.step = options.step || 1;
    this.orientation = options.orientation || 'vertical';
    this.parameter = options.parameter || 'value';
    
    // Visual configuration
    this.label = options.label || '';
    this.showValue = options.showValue !== false;
    this.showTicks = options.showTicks || false;
    this.color = options.color || '#00ff00';
    
    // Interaction state
    this.isDragging = false;
    this.startY = 0;
    this.startValue = 0;
    
    // Callbacks
    this.onChange = options.onChange || (() => {});
    this.onInput = options.onInput || (() => {});
    
    // Debounce/throttle
    this.throttleDelay = options.throttleDelay || 16;
    this.lastUpdate = 0;
    
    // Initialize state
    this.state = {
      value: this.value,
      displayValue: this.formatValue(this.value),
      percentage: this.valueToPercentage(this.value)
    };
  }
  
  /**
   * Get class name for component
   */
  getClassName() {
    const classes = super.getClassName();
    return `${classes} slider-${this.orientation} slider-${this.parameter}`;
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Mouse events
    this.addEventListener(this.element, 'mousedown', (e) => this.handleMouseDown(e));
    this.addEventListener(document, 'mousemove', (e) => this.handleMouseMove(e));
    this.addEventListener(document, 'mouseup', (e) => this.handleMouseUp(e));
    
    // Touch events
    this.addEventListener(this.element, 'touchstart', (e) => this.handleTouchStart(e));
    this.addEventListener(document, 'touchmove', (e) => this.handleTouchMove(e));
    this.addEventListener(document, 'touchend', (e) => this.handleTouchEnd(e));
    
    // Keyboard events
    this.addEventListener(this.element, 'keydown', (e) => this.handleKeyDown(e));
    
    // Wheel events
    this.addEventListener(this.element, 'wheel', (e) => this.handleWheel(e));
  }
  
  /**
   * Render slider
   */
  render() {
    const { value, displayValue, percentage } = this.state;
    
    return `
      <div class="slider-container" tabindex="0" role="slider" 
           aria-label="${this.label}"
           aria-valuemin="${this.min}"
           aria-valuemax="${this.max}"
           aria-valuenow="${value}">
        ${this.label ? `<div class="slider-label">${this.label}</div>` : ''}
        <div class="slider-track">
          <div class="slider-fill" style="${this.getFillStyle(percentage)}"></div>
          <div class="slider-thumb" style="${this.getThumbStyle(percentage)}">
            ${this.showValue ? `<span class="slider-value">${displayValue}</span>` : ''}
          </div>
          ${this.showTicks ? this.renderTicks() : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Get fill style
   */
  getFillStyle(percentage) {
    if (this.orientation === 'vertical') {
      return `height: ${percentage}%; background-color: ${this.color};`;
    } else {
      return `width: ${percentage}%; background-color: ${this.color};`;
    }
  }
  
  /**
   * Get thumb style
   */
  getThumbStyle(percentage) {
    if (this.orientation === 'vertical') {
      return `bottom: ${percentage}%; transform: translateY(50%);`;
    } else {
      return `left: ${percentage}%; transform: translateX(-50%);`;
    }
  }
  
  /**
   * Render tick marks
   */
  renderTicks() {
    const ticks = [];
    const tickCount = 10;
    
    for (let i = 0; i <= tickCount; i++) {
      const percent = (i / tickCount) * 100;
      const style = this.orientation === 'vertical' ? 
        `bottom: ${percent}%` : `left: ${percent}%`;
      ticks.push(`<div class="slider-tick" style="${style}"></div>`);
    }
    
    return `<div class="slider-ticks">${ticks.join('')}</div>`;
  }
  
  /**
   * Handle mouse down
   */
  handleMouseDown(e) {
    if (e.button !== 0) return; // Only left click
    
    e.preventDefault();
    this.startDragging(e.clientX, e.clientY);
  }
  
  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.startDragging(touch.clientX, touch.clientY);
  }
  
  /**
   * Start dragging
   */
  startDragging(x, y) {
    this.isDragging = true;
    this.startY = this.orientation === 'vertical' ? y : x;
    this.startValue = this.value;
    
    this.element.classList.add('dragging');
    document.body.style.userSelect = 'none';
    
    // Update value based on click position
    this.updateValueFromPosition(x, y);
  }
  
  /**
   * Handle mouse move
   */
  handleMouseMove(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    this.updateDragging(e.clientX, e.clientY);
  }
  
  /**
   * Handle touch move
   */
  handleTouchMove(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    this.updateDragging(touch.clientX, touch.clientY);
  }
  
  /**
   * Update dragging
   */
  updateDragging(x, y) {
    // Throttle updates
    const now = performance.now();
    if (now - this.lastUpdate < this.throttleDelay) return;
    this.lastUpdate = now;
    
    this.updateValueFromPosition(x, y);
  }
  
  /**
   * Update value from position
   */
  updateValueFromPosition(x, y) {
    const rect = this.element.querySelector('.slider-track').getBoundingClientRect();
    let percentage;
    
    if (this.orientation === 'vertical') {
      percentage = 1 - ((y - rect.top) / rect.height);
    } else {
      percentage = (x - rect.left) / rect.width;
    }
    
    percentage = Math.max(0, Math.min(1, percentage));
    const newValue = this.percentageToValue(percentage);
    
    if (newValue !== this.value) {
      this.setValue(newValue, true);
    }
  }
  
  /**
   * Handle mouse up
   */
  handleMouseUp(e) {
    if (!this.isDragging) return;
    this.stopDragging();
  }
  
  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    if (!this.isDragging) return;
    this.stopDragging();
  }
  
  /**
   * Stop dragging
   */
  stopDragging() {
    this.isDragging = false;
    this.element.classList.remove('dragging');
    document.body.style.userSelect = '';
    
    // Fire change event
    this.onChange(this.value, this.parameter);
  }
  
  /**
   * Handle keyboard input
   */
  handleKeyDown(e) {
    let newValue = this.value;
    const largeStep = this.step * 10;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        e.preventDefault();
        newValue = Math.min(this.max, this.value + (e.shiftKey ? largeStep : this.step));
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        e.preventDefault();
        newValue = Math.max(this.min, this.value - (e.shiftKey ? largeStep : this.step));
        break;
      case 'Home':
        e.preventDefault();
        newValue = this.min;
        break;
      case 'End':
        e.preventDefault();
        newValue = this.max;
        break;
      case 'PageUp':
        e.preventDefault();
        newValue = Math.min(this.max, this.value + largeStep);
        break;
      case 'PageDown':
        e.preventDefault();
        newValue = Math.max(this.min, this.value - largeStep);
        break;
      default:
        return;
    }
    
    if (newValue !== this.value) {
      this.setValue(newValue);
      this.onChange(newValue, this.parameter);
    }
  }
  
  /**
   * Handle wheel event
   */
  handleWheel(e) {
    e.preventDefault();
    
    const delta = e.deltaY < 0 ? this.step : -this.step;
    const newValue = Math.max(this.min, Math.min(this.max, this.value + delta));
    
    if (newValue !== this.value) {
      this.setValue(newValue);
      this.onChange(newValue, this.parameter);
    }
  }
  
  /**
   * Set slider value
   */
  setValue(value, isInput = false) {
    // Clamp and round value
    value = Math.max(this.min, Math.min(this.max, value));
    value = Math.round(value / this.step) * this.step;
    
    if (value === this.value) return;
    
    this.value = value;
    
    // Update state
    this.setState({
      value: value,
      displayValue: this.formatValue(value),
      percentage: this.valueToPercentage(value)
    });
    
    // Update ARIA
    if (this.element) {
      this.element.querySelector('.slider-container').setAttribute('aria-valuenow', value);
    }
    
    // Fire input event if dragging
    if (isInput) {
      this.onInput(value, this.parameter);
    }
    
    // Emit event
    this.emit('valuechange', { value, parameter: this.parameter });
  }
  
  /**
   * Get slider value
   */
  getValue() {
    return this.value;
  }
  
  /**
   * Convert value to percentage
   */
  valueToPercentage(value) {
    return ((value - this.min) / (this.max - this.min)) * 100;
  }
  
  /**
   * Convert percentage to value
   */
  percentageToValue(percentage) {
    return this.min + (percentage * (this.max - this.min));
  }
  
  /**
   * Format value for display
   */
  formatValue(value) {
    if (this.parameter === 'tempo') {
      return `${Math.round(value)} BPM`;
    } else if (this.parameter === 'swing') {
      return `${Math.round(value)}%`;
    } else if (this.parameter === 'volume') {
      if (value === 0) return '-∞ dB';
      const db = 20 * Math.log10(value / 100);
      return `${db.toFixed(1)} dB`;
    } else {
      return Math.round(value).toString();
    }
  }
  
  /**
   * Enable slider
   */
  enable() {
    super.enable();
    this.element.querySelector('.slider-container').removeAttribute('aria-disabled');
  }
  
  /**
   * Disable slider
   */
  disable() {
    super.disable();
    this.element.querySelector('.slider-container').setAttribute('aria-disabled', 'true');
    this.stopDragging();
  }
  
  /**
   * Update slider configuration
   */
  updateConfig(config) {
    if (config.min !== undefined) this.min = config.min;
    if (config.max !== undefined) this.max = config.max;
    if (config.step !== undefined) this.step = config.step;
    if (config.color !== undefined) this.color = config.color;
    
    // Re-validate current value
    this.setValue(this.value);
  }
  
  /**
   * Destroy component
   */
  destroy() {
    // Stop any ongoing drag
    if (this.isDragging) {
      this.stopDragging();
    }
    
    super.destroy();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SliderComponent;
}
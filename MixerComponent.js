class MixerComponent {
  constructor(otto) {
    this.otto = otto;
    this.currentKit = null;
    this.soloChannels = new Set();
    this.channelElements = {};
    this.fxWindows = {};
    
    this.channelNames = [
      'kick', 'snare', 'sideStick', 'hiHat',
      'tom1', 'tom2', 'tom3', 'tom4', 'tom5',
      'crash1', 'crash2', 'crash3', 'ride', 'bell', 'splash',
      'room', 'reverb1', 'reverb2', 'delay', 'master'
    ];
    
    this.channelLabels = {
      kick: 'Kick',
      snare: 'Snare',
      sideStick: 'Side Stick',
      hiHat: 'Hi-Hat',
      tom1: 'Tom 1',
      tom2: 'Tom 2',
      tom3: 'Tom 3',
      tom4: 'Tom 4',
      tom5: 'Tom 5',
      crash1: 'Crash 1',
      crash2: 'Crash 2',
      crash3: 'Crash 3',
      ride: 'Ride',
      bell: 'Bell',
      splash: 'Splash',
      room: 'Room FX',
      reverb1: 'Reverb 1',
      reverb2: 'Reverb 2',
      delay: 'Delay FX',
      master: 'Master Out'
    };
    
    this.fxTypes = ['eq', 'gate', 'compressor', 'saturation'];
    this.fxLabels = {
      eq: 'EQ',
      gate: 'Gate',
      compressor: 'Comp',
      saturation: 'Tape'
    };
    
    this.initialize();
  }
  
  initialize() {
    // Don't create UI or load data immediately - wait for panel to open
  }
  
  createMixerUI() {
    const container = document.getElementById('mixer-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Create mixer channels
    const channelsWrapper = document.createElement('div');
    channelsWrapper.className = 'mixer-channels-wrapper';
    
    this.channelNames.forEach(channelName => {
      const channel = this.createChannelStrip(channelName);
      channelsWrapper.appendChild(channel);
      this.channelElements[channelName] = channel;
    });
    
    container.appendChild(channelsWrapper);
  }
  
  createChannelStrip(channelName) {
    const strip = document.createElement('div');
    strip.className = 'mixer-channel-strip';
    strip.dataset.channel = channelName;
    
    // Channel label
    const label = document.createElement('div');
    label.className = 'channel-label';
    label.textContent = this.channelLabels[channelName];
    strip.appendChild(label);
    
    // FX Insert buttons (not for FX channels)
    if (!['room', 'reverb1', 'reverb2', 'delay'].includes(channelName)) {
      const fxSection = document.createElement('div');
      fxSection.className = 'channel-fx-section';
      
      this.fxTypes.forEach(fxType => {
        const fxBtn = document.createElement('button');
        fxBtn.className = 'fx-insert-btn';
        fxBtn.dataset.fx = fxType;
        fxBtn.dataset.channel = channelName;
        fxBtn.textContent = this.fxLabels[fxType];
        fxBtn.title = `${this.fxLabels[fxType]} for ${this.channelLabels[channelName]}`;
        fxSection.appendChild(fxBtn);
      });
      
      strip.appendChild(fxSection);
    } else {
      // Add spacer for FX channels
      const spacer = document.createElement('div');
      spacer.className = 'channel-fx-spacer';
      strip.appendChild(spacer);
    }
    
    // Send knobs (not for FX and master channels)
    if (!['room', 'reverb1', 'reverb2', 'delay', 'master'].includes(channelName)) {
      const sendsSection = document.createElement('div');
      sendsSection.className = 'channel-sends-section';
      
      ['room', 'reverb1', 'reverb2', 'delay'].forEach((send, index) => {
        const sendControl = document.createElement('div');
        sendControl.className = 'send-control';
        
        const sendLabel = document.createElement('span');
        sendLabel.className = 'send-label';
        sendLabel.textContent = `S${index + 1}`;
        
        const sendKnob = document.createElement('div');
        sendKnob.className = 'send-knob';
        sendKnob.dataset.send = send;
        sendKnob.dataset.channel = channelName;
        
        const sendValue = document.createElement('div');
        sendValue.className = 'send-value';
        sendValue.textContent = '0';
        
        sendControl.appendChild(sendLabel);
        sendControl.appendChild(sendKnob);
        sendControl.appendChild(sendValue);
        sendsSection.appendChild(sendControl);
      });
      
      strip.appendChild(sendsSection);
    } else {
      // Add spacer for channels without sends
      const spacer = document.createElement('div');
      spacer.className = 'channel-sends-spacer';
      strip.appendChild(spacer);
    }
    
    // Pan knob
    const panSection = document.createElement('div');
    panSection.className = 'channel-pan-section';
    
    const panKnob = document.createElement('div');
    panKnob.className = 'pan-knob';
    panKnob.dataset.channel = channelName;
    
    const panValue = document.createElement('div');
    panValue.className = 'pan-value';
    panValue.textContent = 'C';
    
    panSection.appendChild(panKnob);
    panSection.appendChild(panValue);
    strip.appendChild(panSection);
    
    // Solo/Mute buttons
    const buttonsSection = document.createElement('div');
    buttonsSection.className = 'channel-buttons-section';
    
    const soloBtn = document.createElement('button');
    soloBtn.className = 'channel-solo-btn';
    soloBtn.dataset.channel = channelName;
    soloBtn.textContent = 'S';
    soloBtn.title = `Solo ${this.channelLabels[channelName]}`;
    
    const muteBtn = document.createElement('button');
    muteBtn.className = 'channel-mute-btn';
    muteBtn.dataset.channel = channelName;
    muteBtn.textContent = 'M';
    muteBtn.title = `Mute ${this.channelLabels[channelName]}`;
    
    buttonsSection.appendChild(soloBtn);
    buttonsSection.appendChild(muteBtn);
    strip.appendChild(buttonsSection);
    
    // Fader section
    const faderSection = document.createElement('div');
    faderSection.className = 'channel-fader-section';
    
    const faderTrack = document.createElement('div');
    faderTrack.className = 'fader-track';
    
    const faderThumb = document.createElement('div');
    faderThumb.className = 'fader-thumb';
    faderThumb.dataset.channel = channelName;
    
    const faderValue = document.createElement('div');
    faderValue.className = 'fader-value';
    faderValue.textContent = '0.0';
    
    faderTrack.appendChild(faderThumb);
    faderSection.appendChild(faderTrack);
    faderSection.appendChild(faderValue);
    strip.appendChild(faderSection);
    
    return strip;
  }
  
  attachEventListeners() {
    const container = document.getElementById('mixer-container');
    if (!container) return;
    
    // Fader controls
    container.querySelectorAll('.fader-thumb').forEach(fader => {
      this.setupFaderControl(fader);
    });
    
    // Pan knobs
    container.querySelectorAll('.pan-knob').forEach(knob => {
      this.setupKnobControl(knob, 'pan', -100, 100);
    });
    
    // Send knobs
    container.querySelectorAll('.send-knob').forEach(knob => {
      this.setupKnobControl(knob, 'send', 0, 100);
    });
    
    // Solo buttons
    container.querySelectorAll('.channel-solo-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleSolo(btn.dataset.channel));
    });
    
    // Mute buttons
    container.querySelectorAll('.channel-mute-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleMute(btn.dataset.channel));
    });
    
    // FX insert buttons
    container.querySelectorAll('.fx-insert-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.toggleFX(btn.dataset.channel, btn.dataset.fx);
        this.openFXWindow(btn.dataset.channel, btn.dataset.fx);
      });
    });
  }
  
  setupFaderControl(fader) {
    const track = fader.parentElement;
    const valueDisplay = track.nextElementSibling;
    const channel = fader.dataset.channel;
    let isDragging = false;
    
    const updateFader = (e) => {
      if (!isDragging) return;
      
      const rect = track.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, rect.bottom - e.clientY));
      const value = (y / rect.height) * 100;
      
      fader.style.bottom = `${y - 10}px`;
      valueDisplay.textContent = value.toFixed(1);
      
      this.updateChannelLevel(channel, value);
      
      // Update master volume slider if this is the master channel
      if (channel === 'master') {
        this.updateMasterVolumeSlider(value);
      }
    };
    
    fader.addEventListener('mousedown', (e) => {
      isDragging = true;
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', updateFader);
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
  
  setupKnobControl(knob, type, min, max) {
    const valueDisplay = knob.nextElementSibling || knob.parentElement.querySelector('.send-value');
    const channel = knob.dataset.channel;
    const send = knob.dataset.send;
    let isDragging = false;
    let startY = 0;
    let startValue = 0;
    
    const updateKnob = (e) => {
      if (!isDragging) return;
      
      const deltaY = startY - e.clientY;
      const range = max - min;
      const value = Math.max(min, Math.min(max, startValue + (deltaY / 100) * range));
      const rotation = ((value - min) / range) * 270 - 135;
      
      knob.style.transform = `rotate(${rotation}deg)`;
      
      if (type === 'pan') {
        valueDisplay.textContent = value === 0 ? 'C' : 
                                   value < 0 ? `L${Math.abs(value)}` : `R${value}`;
        this.updateChannelPan(channel, value);
      } else if (type === 'send') {
        valueDisplay.textContent = Math.round(value);
        this.updateChannelSend(channel, send, value);
      }
    };
    
    knob.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startValue = type === 'pan' ? 0 : 0; // Get current value from model
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', updateKnob);
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
  
  loadCurrentKitMixer() {
    // First ensure the UI is created
    const container = document.getElementById('mixer-container');
    if (!container) {
      console.error('Mixer container not found');
      return;
    }
    
    if (container.children.length === 0) {
      this.createMixerUI();
      this.attachEventListeners();
    }
    
    const drumkitManager = this.otto.drumkitManager;
    if (!drumkitManager) {
      return;
    }
    
    // For now, use the current player's kit name
    const currentKitName = this.otto.playerStates?.[this.otto.currentPlayer]?.kitName || 'Acoustic';
    this.currentKit = currentKitName;
    
    // Try to get mixer preset
    const mixerPreset = drumkitManager.getMixerPreset(currentKitName, 'default');
    
    if (mixerPreset && mixerPreset.channels) {
      this.updateMixerUI(mixerPreset.channels);
    } else {
      // Create default preset if none exists
      const defaultPreset = drumkitManager.createDefaultMixerPreset('default');
      if (defaultPreset && defaultPreset.channels) {
        drumkitManager.setMixerPreset(currentKitName, 'default', defaultPreset);
        this.updateMixerUI(defaultPreset.channels);
      }
    }
  }
  
  updateMixerUI(channels) {
    Object.keys(channels).forEach(channelName => {
      const channelData = channels[channelName];
      const strip = this.channelElements[channelName];
      if (!strip) return;
      
      // Update fader
      const fader = strip.querySelector('.fader-thumb');
      const faderValue = strip.querySelector('.fader-value');
      if (fader && faderValue) {
        const track = fader.parentElement;
        const y = (channelData.level / 100) * track.offsetHeight;
        fader.style.bottom = `${y - 10}px`;
        faderValue.textContent = channelData.level.toFixed(1);
      }
      
      // Update pan
      const panKnob = strip.querySelector('.pan-knob');
      const panValue = strip.querySelector('.pan-value');
      if (panKnob && panValue) {
        const rotation = ((channelData.pan + 100) / 200) * 270 - 135;
        panKnob.style.transform = `rotate(${rotation}deg)`;
        panValue.textContent = channelData.pan === 0 ? 'C' : 
                              channelData.pan < 0 ? `L${Math.abs(channelData.pan)}` : 
                              `R${channelData.pan}`;
      }
      
      // Update sends
      if (channelData.sends) {
        Object.keys(channelData.sends).forEach(sendName => {
          const sendKnob = strip.querySelector(`.send-knob[data-send="${sendName}"]`);
          const sendValue = sendKnob?.parentElement.querySelector('.send-value');
          if (sendKnob && sendValue) {
            const rotation = (channelData.sends[sendName] / 100) * 270 - 135;
            sendKnob.style.transform = `rotate(${rotation}deg)`;
            sendValue.textContent = Math.round(channelData.sends[sendName]);
          }
        });
      }
      
      // Update mute/solo
      const muteBtn = strip.querySelector('.channel-mute-btn');
      const soloBtn = strip.querySelector('.channel-solo-btn');
      if (muteBtn) {
        muteBtn.classList.toggle('active', channelData.mute);
      }
      if (soloBtn) {
        soloBtn.classList.toggle('active', channelData.solo);
      }
      
      // Update FX buttons
      if (channelData.fx) {
        Object.keys(channelData.fx).forEach(fxType => {
          const fxBtn = strip.querySelector(`.fx-insert-btn[data-fx="${fxType}"]`);
          if (fxBtn) {
            fxBtn.classList.toggle('active', channelData.fx[fxType]);
          }
        });
      }
    });
  }
  
  updateChannelLevel(channel, value) {
    if (!this.currentKit) return;
    
    const drumkitManager = this.otto.drumkitManager;
    if (drumkitManager) {
      drumkitManager.updateChannelLevel(this.currentKit, 'default', channel, value);
    }
  }
  
  updateChannelPan(channel, value) {
    if (!this.currentKit) return;
    
    const drumkitManager = this.otto.drumkitManager;
    if (drumkitManager) {
      drumkitManager.updateChannelPanning(this.currentKit, 'default', channel, value);
    }
  }
  
  updateChannelSend(channel, send, value) {
    if (!this.currentKit) return;
    
    const drumkitManager = this.otto.drumkitManager;
    if (drumkitManager) {
      const preset = drumkitManager.getMixerPreset(this.currentKit, 'default');
      if (preset && preset.channels && preset.channels[channel]) {
        preset.channels[channel].sends[send] = value;
        drumkitManager.setMixerPreset(this.currentKit, 'default', preset);
      }
    }
  }
  
  toggleSolo(channel) {
    const strip = this.channelElements[channel];
    const soloBtn = strip?.querySelector('.channel-solo-btn');
    if (!soloBtn) return;
    
    const isActive = soloBtn.classList.toggle('active');
    
    if (isActive) {
      this.soloChannels.add(channel);
    } else {
      this.soloChannels.delete(channel);
    }
    
    // Update all mute states based on solo
    this.updateSoloMuteStates();
  }
  
  toggleMute(channel) {
    const strip = this.channelElements[channel];
    const muteBtn = strip?.querySelector('.channel-mute-btn');
    if (!muteBtn) return;
    
    const isActive = muteBtn.classList.toggle('active');
    
    if (this.currentKit) {
      const drumkitManager = this.otto.drumkitManager;
      if (drumkitManager) {
        const preset = drumkitManager.getMixerPreset(this.currentKit, 'default');
        if (preset && preset.channels && preset.channels[channel]) {
          preset.channels[channel].mute = isActive;
          drumkitManager.setMixerPreset(this.currentKit, 'default', preset);
        }
      }
    }
  }
  
  toggleFX(channel, fxType) {
    if (!this.currentKit) return;
    
    const drumkitManager = this.otto.drumkitManager;
    if (drumkitManager) {
      const preset = drumkitManager.getMixerPreset(this.currentKit, 'default');
      if (preset && preset.channels && preset.channels[channel]) {
        preset.channels[channel].fx[fxType] = !preset.channels[channel].fx[fxType];
        drumkitManager.setMixerPreset(this.currentKit, 'default', preset);
      }
    }
  }
  
  openFXWindow(channel, fxType) {
    const windowId = `fx-${channel}-${fxType}`;
    
    // Create FX window if it doesn't exist
    if (!this.fxWindows[windowId]) {
      this.createFXWindow(channel, fxType, windowId);
    }
    
    // Toggle window visibility
    const fxWindow = document.getElementById(windowId);
    if (fxWindow) {
      fxWindow.classList.toggle('active');
    }
  }
  
  createFXWindow(channel, fxType, windowId) {
    const fxWindow = document.createElement('div');
    fxWindow.id = windowId;
    fxWindow.className = 'fx-window';
    
    const header = document.createElement('div');
    header.className = 'fx-window-header';
    header.innerHTML = `
      <h3>${this.fxLabels[fxType]} - ${this.channelLabels[channel]}</h3>
      <button class="fx-window-close" data-window="${windowId}">×</button>
    `;
    
    const body = document.createElement('div');
    body.className = 'fx-window-body';
    body.innerHTML = this.getFXControls(fxType);
    
    fxWindow.appendChild(header);
    fxWindow.appendChild(body);
    document.body.appendChild(fxWindow);
    
    // Make window draggable
    this.makeDraggable(fxWindow, header);
    
    // Close button
    header.querySelector('.fx-window-close').addEventListener('click', () => {
      fxWindow.classList.remove('active');
    });
    
    this.fxWindows[windowId] = fxWindow;
  }
  
  getFXControls(fxType) {
    switch(fxType) {
      case 'eq':
        return `
          <div class="fx-eq-controls">
            <div class="eq-band">
              <label>Low</label>
              <input type="range" class="eq-slider" min="-12" max="12" value="0">
              <span>0 dB</span>
            </div>
            <div class="eq-band">
              <label>Low Mid</label>
              <input type="range" class="eq-slider" min="-12" max="12" value="0">
              <span>0 dB</span>
            </div>
            <div class="eq-band">
              <label>High Mid</label>
              <input type="range" class="eq-slider" min="-12" max="12" value="0">
              <span>0 dB</span>
            </div>
            <div class="eq-band">
              <label>High</label>
              <input type="range" class="eq-slider" min="-12" max="12" value="0">
              <span>0 dB</span>
            </div>
          </div>
        `;
      case 'gate':
        return `
          <div class="fx-gate-controls">
            <div class="fx-control">
              <label>Threshold</label>
              <input type="range" class="gate-slider" min="-60" max="0" value="-30">
              <span>-30 dB</span>
            </div>
            <div class="fx-control">
              <label>Attack</label>
              <input type="range" class="gate-slider" min="0" max="100" value="10">
              <span>10 ms</span>
            </div>
            <div class="fx-control">
              <label>Hold</label>
              <input type="range" class="gate-slider" min="0" max="500" value="50">
              <span>50 ms</span>
            </div>
            <div class="fx-control">
              <label>Release</label>
              <input type="range" class="gate-slider" min="0" max="1000" value="100">
              <span>100 ms</span>
            </div>
          </div>
        `;
      case 'compressor':
        return `
          <div class="fx-comp-controls">
            <div class="fx-control">
              <label>Threshold</label>
              <input type="range" class="comp-slider" min="-40" max="0" value="-10">
              <span>-10 dB</span>
            </div>
            <div class="fx-control">
              <label>Ratio</label>
              <input type="range" class="comp-slider" min="1" max="20" value="4">
              <span>4:1</span>
            </div>
            <div class="fx-control">
              <label>Attack</label>
              <input type="range" class="comp-slider" min="0" max="100" value="10">
              <span>10 ms</span>
            </div>
            <div class="fx-control">
              <label>Release</label>
              <input type="range" class="comp-slider" min="0" max="1000" value="100">
              <span>100 ms</span>
            </div>
            <div class="fx-control">
              <label>Makeup Gain</label>
              <input type="range" class="comp-slider" min="0" max="20" value="0">
              <span>0 dB</span>
            </div>
          </div>
        `;
      case 'saturation':
        return `
          <div class="fx-sat-controls">
            <div class="fx-control">
              <label>Drive</label>
              <input type="range" class="sat-slider" min="0" max="100" value="30">
              <span>30%</span>
            </div>
            <div class="fx-control">
              <label>Mix</label>
              <input type="range" class="sat-slider" min="0" max="100" value="50">
              <span>50%</span>
            </div>
            <div class="fx-control">
              <label>Tone</label>
              <input type="range" class="sat-slider" min="0" max="100" value="50">
              <span>50%</span>
            </div>
          </div>
        `;
      default:
        return '<p>FX controls coming soon...</p>';
    }
  }
  
  makeDraggable(element, handle) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    handle.addEventListener('mousedown', dragStart);
    
    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      
      if (e.target === handle || handle.contains(e.target)) {
        isDragging = true;
      }
    }
    
    function dragEnd(e) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    }
    
    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        xOffset = currentX;
        yOffset = currentY;
        
        element.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    }
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
  }
  
  updateSoloMuteStates() {
    const hasSolo = this.soloChannels.size > 0;
    
    this.channelNames.forEach(channel => {
      const strip = this.channelElements[channel];
      if (!strip) return;
      
      if (hasSolo && !this.soloChannels.has(channel)) {
        strip.classList.add('implicit-mute');
      } else {
        strip.classList.remove('implicit-mute');
      }
    });
  }
  
  updateMasterVolumeSlider(value) {
    // Find the master volume slider in row5-right-area5
    const volumeSlider = document.querySelector('.row5-right-area5 .custom-slider[data-param="volume"]');
    if (volumeSlider) {
      // Update the data-value attribute
      volumeSlider.setAttribute('data-value', value);
      
      // Update the visual elements
      const fill = volumeSlider.querySelector('.slider-fill');
      const thumb = volumeSlider.querySelector('.slider-thumb');
      
      if (fill) {
        fill.style.width = `${value}%`;
      }
      if (thumb) {
        thumb.style.left = `${value}%`;
      }
      
      // Trigger the otto slider update method if available
      if (this.otto.updateCustomSlider) {
        this.otto.updateCustomSlider(volumeSlider, value);
      }
      
      // Also trigger any JUCE callbacks if needed
      if (this.otto.propagateSliderValue) {
        this.otto.propagateSliderValue('volume', value, false);
      }
    }
  }
  
  updateMixerMasterFromMainVolume(value) {
    // Update the mixer's master channel fader when main volume changes
    const masterStrip = this.channelElements['master'];
    if (!masterStrip) return;
    
    const fader = masterStrip.querySelector('.fader-thumb');
    const faderValue = masterStrip.querySelector('.fader-value');
    
    if (fader && faderValue) {
      const track = fader.parentElement;
      const y = (value / 100) * track.offsetHeight;
      fader.style.bottom = `${y - 10}px`;
      faderValue.textContent = value.toFixed(1);
      
      // Also update the model
      this.updateChannelLevel('master', value);
    }
  }
  
  onKitChange(newKit) {
    this.currentKit = newKit;
    this.loadCurrentKitMixer();
  }
  
  destroy() {
    // Clean up event listeners and FX windows
    Object.values(this.fxWindows).forEach(window => {
      if (window && window.parentNode) {
        window.parentNode.removeChild(window);
      }
    });
    
    this.fxWindows = {};
    this.channelElements = {};
    this.soloChannels.clear();
  }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MixerComponent;
}
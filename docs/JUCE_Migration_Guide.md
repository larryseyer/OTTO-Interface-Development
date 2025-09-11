# JUCE 8 Migration Guide for OTTO Interface

## Table of Contents

1. [Overview](#overview)
2. [Architecture Translation](#architecture-translation)
3. [Component Migration](#component-migration)
4. [State Management](#state-management)
5. [Event System](#event-system)
6. [Audio Processing](#audio-processing)
7. [UI Components](#ui-components)
8. [Storage & Persistence](#storage--persistence)
9. [Threading & Async](#threading--async)
10. [Code Examples](#code-examples)
11. [Migration Checklist](#migration-checklist)

---

## Overview

This guide provides a comprehensive roadmap for migrating the OTTO JavaScript interface to JUCE 8 C++. The current JavaScript architecture has been designed with JUCE patterns in mind, making the translation straightforward.

### Key Principles

- **Direct mapping** - Each JS class maps to a JUCE equivalent
- **Pattern preservation** - Maintain architectural patterns
- **Performance focus** - Leverage C++ for real-time audio
- **Type safety** - Utilize C++ strong typing

---

## Architecture Translation

### Project Structure

```
JavaScript Structure          →  JUCE Structure
/src                            /Source
  /core                           /Core
    EventManager.js                 EventManager.h/.cpp
    StateManager.js                 StateManager.h/.cpp
  /managers                       /Managers
    PlayerStateManager.js           PlayerStateManager.h/.cpp
  /components                     /Components
    SliderComponent.js              SliderComponent.h/.cpp
  /utils                          /Utils
    Validator.js                    Validator.h/.cpp
```

### Class Translation Template

```cpp
// JavaScript
class ComponentName {
    constructor(options) {
        this.options = options;
    }
    
    method() {
        return this.options.value;
    }
}

// JUCE C++
class ComponentName : public juce::Component
{
public:
    ComponentName (const Options& options)
        : options (options)
    {
    }
    
    auto method() const -> ValueType
    {
        return options.value;
    }
    
private:
    Options options;
    
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (ComponentName)
};
```

---

## Component Migration

### StateManager → ValueTree + UndoManager

```cpp
// StateManager.h
class StateManager : public juce::ValueTree::Listener
{
public:
    StateManager();
    ~StateManager() override;
    
    void setState (const juce::ValueTree& newState);
    juce::ValueTree getState() const;
    
    void undo();
    void redo();
    bool canUndo() const;
    bool canRedo() const;
    
    void addListener (Listener* listener);
    void removeListener (Listener* listener);
    
private:
    juce::ValueTree state;
    juce::UndoManager undoManager;
    juce::ListenerList<Listener> listeners;
    
    void valueTreePropertyChanged (juce::ValueTree&, const juce::Identifier&) override;
};

// StateManager.cpp
StateManager::StateManager()
    : state ("OTTOState")
{
    state.addListener (this);
}

void StateManager::setState (const juce::ValueTree& newState)
{
    undoManager.beginNewTransaction();
    state.copyPropertiesAndChildrenFrom (newState, &undoManager);
}

void StateManager::undo()
{
    undoManager.undo();
}
```

### EventManager → ListenerList + MessageManager

```cpp
// EventManager.h
class EventManager
{
public:
    class Listener
    {
    public:
        virtual ~Listener() = default;
        virtual void handleEvent (const Event& event) = 0;
    };
    
    void addEventListener (Component* component, 
                          const String& eventType, 
                          Listener* listener);
    
    void removeEventListener (Component* component,
                             const String& eventType,
                             Listener* listener);
    
    void dispatchEvent (const Event& event);
    
private:
    struct ComponentListeners
    {
        Component* component;
        String eventType;
        ListenerList<Listener> listeners;
    };
    
    OwnedArray<ComponentListeners> componentListeners;
};
```

---

## State Management

### JavaScript State Object → JUCE ValueTree

```cpp
// JavaScript
const state = {
    players: {
        player1: {
            tempo: 120,
            kitName: "Rock Kit"
        }
    }
};

// JUCE
ValueTree state ("State");
ValueTree players ("Players");
ValueTree player1 ("Player");
player1.setProperty ("id", "player1", nullptr);
player1.setProperty ("tempo", 120, nullptr);
player1.setProperty ("kitName", "Rock Kit", nullptr);
players.addChild (player1, -1, nullptr);
state.addChild (players, -1, nullptr);
```

### State Serialization

```cpp
// Save state to XML
auto xml = state.createXml();
xml->writeTo (File ("/path/to/state.xml"));

// Load state from XML
auto xml = parseXML (File ("/path/to/state.xml"));
if (xml != nullptr)
{
    state = ValueTree::fromXml (*xml);
}

// Save state to binary
MemoryOutputStream stream;
state.writeToStream (stream);
File ("/path/to/state.dat").replaceWithData (
    stream.getData(), stream.getDataSize());
```

---

## Event System

### DOM Events → JUCE Component Listeners

```cpp
// JavaScript
eventManager.on(element, 'click', handler);

// JUCE
class MyComponent : public Component,
                    public Button::Listener
{
public:
    MyComponent()
    {
        button.addListener (this);
        addAndMakeVisible (button);
    }
    
    void buttonClicked (Button* buttonThatWasClicked) override
    {
        if (buttonThatWasClicked == &button)
        {
            // Handle click
        }
    }
    
private:
    TextButton button {"Click Me"};
};
```

### Custom Events → JUCE Messages

```cpp
// Define custom message
class CustomMessage : public Message
{
public:
    CustomMessage (const String& data) : messageData (data) {}
    String messageData;
};

// Send message
postMessage (new CustomMessage ("Hello"));

// Handle message
void handleMessage (const Message& message) override
{
    if (auto* custom = dynamic_cast<const CustomMessage*> (&message))
    {
        // Handle custom message
        DBG (custom->messageData);
    }
}
```

---

## Audio Processing

### Pattern Playback Engine

```cpp
class PatternPlayer : public AudioSource
{
public:
    void prepareToPlay (int samplesPerBlockExpected, 
                       double sampleRate) override
    {
        this->sampleRate = sampleRate;
        currentPosition = 0;
    }
    
    void getNextAudioBlock (const AudioSourceChannelInfo& bufferToFill) override
    {
        auto* buffer = bufferToFill.buffer;
        auto numSamples = bufferToFill.numSamples;
        
        for (int sample = 0; sample < numSamples; ++sample)
        {
            auto stepPosition = getCurrentStep();
            
            if (shouldTrigger (stepPosition))
            {
                triggerSample (stepPosition);
            }
            
            advancePosition();
        }
    }
    
private:
    double sampleRate = 44100.0;
    int64 currentPosition = 0;
    Array<bool> pattern;
    
    int getCurrentStep() const
    {
        auto samplesPerStep = (60.0 / tempo) * sampleRate / 4.0;
        return static_cast<int> (currentPosition / samplesPerStep) % 16;
    }
};
```

### Mixer Implementation

```cpp
class MixerChannel : public AudioProcessor
{
public:
    MixerChannel()
    {
        addParameter (volume = new AudioParameterFloat (
            "volume", "Volume", 0.0f, 1.0f, 0.7f));
        addParameter (pan = new AudioParameterFloat (
            "pan", "Pan", -1.0f, 1.0f, 0.0f));
    }
    
    void processBlock (AudioBuffer<float>& buffer, 
                       MidiBuffer& midiMessages) override
    {
        auto gain = volume->get();
        auto panValue = pan->get();
        
        // Apply gain
        buffer.applyGain (gain);
        
        // Apply pan
        if (buffer.getNumChannels() == 2)
        {
            auto leftGain = std::cos ((panValue + 1.0f) * MathConstants<float>::halfPi / 2.0f);
            auto rightGain = std::sin ((panValue + 1.0f) * MathConstants<float>::halfPi / 2.0f);
            
            buffer.applyGain (0, 0, buffer.getNumSamples(), leftGain);
            buffer.applyGain (1, 0, buffer.getNumSamples(), rightGain);
        }
    }
    
private:
    AudioParameterFloat* volume;
    AudioParameterFloat* pan;
};
```

---

## UI Components

### SliderComponent Migration

```cpp
// SliderComponent.h
class SliderComponent : public Component,
                        public Slider::Listener
{
public:
    SliderComponent (const String& name = String())
    {
        slider.setSliderStyle (Slider::LinearVertical);
        slider.setRange (0.0, 100.0, 1.0);
        slider.setValue (50.0);
        slider.addListener (this);
        addAndMakeVisible (slider);
    }
    
    void resized() override
    {
        slider.setBounds (getLocalBounds());
    }
    
    void sliderValueChanged (Slider* sliderThatChanged) override
    {
        if (onChange)
            onChange (sliderThatChanged->getValue());
    }
    
    std::function<void (double)> onChange;
    
private:
    Slider slider;
};
```

### PatternGrid Implementation

```cpp
class PatternGrid : public Component
{
public:
    PatternGrid (int rows = 16, int cols = 16)
        : numRows (rows), numCols (cols)
    {
        pattern.resize (rows * cols);
        std::fill (pattern.begin(), pattern.end(), false);
    }
    
    void paint (Graphics& g) override
    {
        auto cellWidth = getWidth() / float (numCols);
        auto cellHeight = getHeight() / float (numRows);
        
        for (int row = 0; row < numRows; ++row)
        {
            for (int col = 0; col < numCols; ++col)
            {
                auto index = row * numCols + col;
                auto bounds = Rectangle<float> (
                    col * cellWidth, row * cellHeight,
                    cellWidth - 1, cellHeight - 1);
                
                g.setColour (pattern[index] ? Colours::orange : Colours::darkgrey);
                g.fillRect (bounds);
            }
        }
    }
    
    void mouseDown (const MouseEvent& event) override
    {
        auto cellWidth = getWidth() / float (numCols);
        auto cellHeight = getHeight() / float (numRows);
        
        int col = int (event.x / cellWidth);
        int row = int (event.y / cellHeight);
        
        if (isPositiveAndBelow (col, numCols) && 
            isPositiveAndBelow (row, numRows))
        {
            auto index = row * numCols + col;
            pattern[index] = !pattern[index];
            repaint();
            
            if (onPatternChange)
                onPatternChange (pattern);
        }
    }
    
    std::function<void (const std::vector<bool>&)> onPatternChange;
    
private:
    int numRows, numCols;
    std::vector<bool> pattern;
};
```

---

## Storage & Persistence

### LocalStorage → PropertiesFile

```cpp
// JavaScript
localStorage.setItem('key', JSON.stringify(data));
const data = JSON.parse(localStorage.getItem('key'));

// JUCE
class StorageManager
{
public:
    StorageManager()
    {
        PropertiesFile::Options options;
        options.applicationName = "OTTO";
        options.filenameSuffix = ".settings";
        options.folderName = "OTTO";
        options.osxLibrarySubFolder = "Application Support";
        
        properties = std::make_unique<PropertiesFile> (options);
    }
    
    void saveState (const String& key, const var& data)
    {
        properties->setValue (key, JSON::toString (data));
        properties->save();
    }
    
    var loadState (const String& key)
    {
        auto jsonString = properties->getValue (key);
        return JSON::parse (jsonString);
    }
    
private:
    std::unique_ptr<PropertiesFile> properties;
};
```

### File Operations

```cpp
// Save preset to file
void savePreset (const ValueTree& preset, const File& file)
{
    if (auto xml = preset.createXml())
    {
        xml->writeTo (file);
    }
}

// Load preset from file
ValueTree loadPreset (const File& file)
{
    if (auto xml = parseXML (file))
    {
        return ValueTree::fromXml (*xml);
    }
    return {};
}

// Export as JSON
void exportJSON (const ValueTree& state, const File& file)
{
    auto json = valueTreeToJSON (state);
    file.replaceWithText (JSON::toString (json));
}
```

---

## Threading & Async

### Promises → AsyncUpdater/Thread

```cpp
// JavaScript
async function loadKit(name) {
    const kit = await fetch(`/kits/${name}.json`);
    return kit.json();
}

// JUCE
class KitLoader : public Thread,
                  public AsyncUpdater
{
public:
    KitLoader() : Thread ("KitLoader") {}
    
    void loadKit (const String& kitName)
    {
        this->kitName = kitName;
        startThread();
    }
    
    void run() override
    {
        // Load kit in background thread
        URL url ("https://example.com/kits/" + kitName + ".json");
        auto stream = url.createInputStream (false);
        
        if (stream != nullptr)
        {
            auto json = JSON::parse (stream->readEntireStreamAsString());
            
            // Store result and trigger async update
            {
                ScopedLock lock (resultLock);
                loadedKit = json;
            }
            
            triggerAsyncUpdate();
        }
    }
    
    void handleAsyncUpdate() override
    {
        // Called on message thread
        ScopedLock lock (resultLock);
        if (onKitLoaded)
            onKitLoaded (loadedKit);
    }
    
    std::function<void (const var&)> onKitLoaded;
    
private:
    String kitName;
    var loadedKit;
    CriticalSection resultLock;
};
```

### Timer-based Updates

```cpp
// JavaScript
setInterval(() => {
    updateDisplay();
}, 100);

// JUCE
class DisplayUpdater : public Component,
                       private Timer
{
public:
    DisplayUpdater()
    {
        startTimerHz (10); // 100ms interval
    }
    
    void timerCallback() override
    {
        updateDisplay();
        repaint();
    }
    
private:
    void updateDisplay()
    {
        // Update display logic
    }
};
```

---

## Code Examples

### Complete Manager Translation

```cpp
// PlayerStateManager.h
class PlayerStateManager : public ValueTree::Listener
{
public:
    struct PlayerState
    {
        String id;
        String kitName;
        int tempo;
        String patternGroup;
        Array<float> sliders;
    };
    
    PlayerStateManager (StateManager& stateManager);
    
    void setPlayerState (const String& playerId, const PlayerState& state);
    PlayerState getPlayerState (const String& playerId) const;
    
    void setTempo (const String& playerId, int tempo);
    void setDrumkit (const String& playerId, const String& kitName);
    
private:
    StateManager& stateManager;
    HashMap<String, PlayerState> playerStates;
    
    void updateStateTree();
    void loadFromStateTree();
};

// PlayerStateManager.cpp
PlayerStateManager::PlayerStateManager (StateManager& sm)
    : stateManager (sm)
{
    auto state = stateManager.getState();
    state.addListener (this);
    loadFromStateTree();
}

void PlayerStateManager::setPlayerState (const String& playerId, 
                                         const PlayerState& state)
{
    playerStates.set (playerId, state);
    updateStateTree();
}

void PlayerStateManager::updateStateTree()
{
    auto state = stateManager.getState();
    auto players = state.getOrCreateChildWithName ("players", nullptr);
    
    for (auto& [id, playerState] : playerStates)
    {
        auto player = players.getOrCreateChildWithName (id, nullptr);
        player.setProperty ("kitName", playerState.kitName, nullptr);
        player.setProperty ("tempo", playerState.tempo, nullptr);
        player.setProperty ("patternGroup", playerState.patternGroup, nullptr);
    }
}
```

### Complete Component Translation

```cpp
// MixerWindow.h
class MixerWindow : public DocumentWindow
{
public:
    MixerWindow (const String& name, int numChannels = 16)
        : DocumentWindow (name, Colours::darkgrey, 
                         DocumentWindow::allButtons)
    {
        setUsingNativeTitleBar (true);
        setContentOwned (new MixerPanel (numChannels), true);
        setResizable (true, false);
        centreWithSize (800, 600);
        setVisible (true);
    }
    
    void closeButtonPressed() override
    {
        setVisible (false);
    }
    
private:
    class MixerPanel : public Component
    {
    public:
        MixerPanel (int numChannels)
        {
            for (int i = 0; i < numChannels; ++i)
            {
                auto channel = std::make_unique<ChannelStrip> (i);
                addAndMakeVisible (channel.get());
                channels.add (std::move (channel));
            }
        }
        
        void resized() override
        {
            auto channelWidth = getWidth() / channels.size();
            
            for (int i = 0; i < channels.size(); ++i)
            {
                channels[i]->setBounds (i * channelWidth, 0, 
                                       channelWidth, getHeight());
            }
        }
        
    private:
        OwnedArray<ChannelStrip> channels;
    };
    
    class ChannelStrip : public Component
    {
    public:
        ChannelStrip (int channelNumber)
            : number (channelNumber)
        {
            volumeSlider.setSliderStyle (Slider::LinearVertical);
            volumeSlider.setRange (0.0, 1.0);
            volumeSlider.setValue (0.7);
            
            panSlider.setSliderStyle (Slider::Rotary);
            panSlider.setRange (-1.0, 1.0);
            panSlider.setValue (0.0);
            
            muteButton.setButtonText ("M");
            soloButton.setButtonText ("S");
            
            addAndMakeVisible (volumeSlider);
            addAndMakeVisible (panSlider);
            addAndMakeVisible (muteButton);
            addAndMakeVisible (soloButton);
        }
        
        void resized() override
        {
            auto bounds = getLocalBounds();
            auto buttonArea = bounds.removeFromTop (60);
            auto panArea = bounds.removeFromTop (60);
            
            muteButton.setBounds (buttonArea.removeFromLeft (30));
            soloButton.setBounds (buttonArea.removeFromLeft (30));
            panSlider.setBounds (panArea);
            volumeSlider.setBounds (bounds);
        }
        
    private:
        int number;
        Slider volumeSlider, panSlider;
        TextButton muteButton, soloButton;
    };
};
```

---

## Migration Checklist

### Phase 1: Project Setup
- [ ] Create JUCE project with Projucer
- [ ] Configure build settings for target platforms
- [ ] Set up directory structure matching JS architecture
- [ ] Add JUCE modules (core, audio, gui, data)

### Phase 2: Core Systems
- [ ] Implement StateManager with ValueTree
- [ ] Create EventManager with ListenerList
- [ ] Set up MessageBus for inter-component communication
- [ ] Implement undo/redo with UndoManager

### Phase 3: Managers
- [ ] Translate PlayerStateManager
- [ ] Translate PatternGroupManager
- [ ] Translate DrumkitManager
- [ ] Translate PresetManager
- [ ] Translate LinkManager
- [ ] Translate StorageManager

### Phase 4: UI Components
- [ ] Create base UIComponent class
- [ ] Implement SliderComponent
- [ ] Implement DropdownComponent
- [ ] Implement PatternGridComponent
- [ ] Implement ModalManager
- [ ] Set up LookAndFeel

### Phase 5: Audio Engine
- [ ] Create AudioProcessor for pattern playback
- [ ] Implement mixer with per-channel processing
- [ ] Add effects chain support
- [ ] Set up sample loading and caching
- [ ] Implement tempo sync

### Phase 6: Storage & Settings
- [ ] Set up PropertiesFile for settings
- [ ] Implement preset save/load
- [ ] Add import/export functionality
- [ ] Create migration for existing JS data

### Phase 7: Testing
- [ ] Port unit tests to JUCE UnitTest framework
- [ ] Create integration tests
- [ ] Set up performance benchmarks
- [ ] Add memory leak detection

### Phase 8: Polish
- [ ] Optimize performance bottlenecks
- [ ] Add keyboard shortcuts
- [ ] Implement drag & drop
- [ ] Add accessibility features
- [ ] Create installer packages

---

## Performance Considerations

### Real-time Audio
- Use lock-free data structures for audio thread
- Avoid memory allocation in audio callbacks
- Pre-calculate values where possible
- Use SIMD operations for DSP

### UI Responsiveness
- Perform heavy operations on background threads
- Use AsyncUpdater for thread-safe UI updates
- Implement dirty region painting
- Cache rendered components

### Memory Management
- Use RAII and smart pointers
- Implement object pools for frequently created objects
- Monitor memory usage with LeakDetector
- Clear unused resources aggressively

---

## Common Pitfalls & Solutions

### Problem: Thread Safety
**JS:** No explicit thread management
**JUCE:** Must handle multiple threads safely

**Solution:**
```cpp
// Use CriticalSection for thread safety
CriticalSection dataLock;
Array<float> sharedData;

void updateData (const Array<float>& newData)
{
    const ScopedLock sl (dataLock);
    sharedData = newData;
}
```

### Problem: Event Handling Differences
**JS:** Bubbling/capturing phases
**JUCE:** Direct listener pattern

**Solution:**
```cpp
// Implement custom event propagation if needed
void mouseDown (const MouseEvent& e) override
{
    // Handle event
    if (!e.mods.isPopupMenu())
    {
        // Propagate to parent if needed
        if (auto* parent = getParentComponent())
            parent->mouseDown (e.getEventRelativeTo (parent));
    }
}
```

### Problem: Async Operations
**JS:** Promises and async/await
**JUCE:** Callbacks and threads

**Solution:**
```cpp
// Create promise-like pattern
template<typename T>
class Promise : public Thread
{
public:
    Promise (std::function<T()> task) 
        : Thread ("Promise"), task (task) {}
    
    void then (std::function<void (T)> callback)
    {
        this->callback = callback;
        startThread();
    }
    
    void run() override
    {
        auto result = task();
        MessageManager::callAsync ([=]() {
            if (callback)
                callback (result);
        });
    }
    
private:
    std::function<T()> task;
    std::function<void (T)> callback;
};
```

---

## Resources

### Documentation
- [JUCE Documentation](https://docs.juce.com)
- [JUCE Forum](https://forum.juce.com)
- [JUCE Tutorials](https://juce.com/learn/tutorials)

### Tools
- Projucer for project management
- JUCE_LIVE_CONSTANT for live coding
- AudioPluginHost for testing
- Perfetto for performance profiling

### Example Projects
- JUCE Demo Runner
- DemoRunner examples
- Open source JUCE projects on GitHub

---

## Conclusion

The migration from JavaScript to JUCE 8 is straightforward due to the aligned architecture. Focus on:

1. Maintaining the same architectural patterns
2. Leveraging JUCE's built-in components
3. Ensuring thread safety
4. Optimizing for real-time performance

The modular design ensures that components can be migrated incrementally, allowing for testing and validation at each step.
# OTTO Interface Row Structure Reference

The OTTO interface is organized into 6 distinct rows, each with specific functionality and height percentages:

## **Row 1 - Top Bar (8% height)**
- Settings button (left)
- Preset navigation and dropdown
- Tempo display and tap tempo
- Version info (right)
- Additional icons: Link, Upload, Pause

## **Row 2 - Player Tabs (15% height)**
- 8 player selection buttons (PLAYER 1 through PLAYER 8)
- Uses Button100.png graphics for 3D appearance
- Active/hover states with background positioning

## **Row 3 - Drum Kit Section (12% height)**
- Player number display (large numeral on left)
- Kit navigation chevrons and dropdown
- Kit name display
- Drum kit mixer icon (right)
- Mini sliders (3 vertical sliders)

## **Row 4 - Pattern Groups (14% height)**
- Pattern group navigation (left/right arrows)
- Favorites dropdown selector
- Edit button for favorites

## **Row 5 - Pattern Matrix (45% height)**
Split into two halves:
### Left Half (50%)
- 4x4 pattern grid with 16 style buttons:
  - Basic, Bassa, BusyBeat, Buyoun
  - ChaCha, Funk, Jazz, Just Hat
  - Just Kick, Polka, Push, Shuffle
  - Ska, Surf, Swing, Waltz

### Right Half (50%)
- Toggle buttons: Auto/Manual (radio), Stick, Ride, Lock
- Fill buttons: 4, 8, 16, 32, Solo
- Main sliders: Swing, Energy, Volume (vertical with link icons)

## **Row 6 - Loop Section (12% height)**
- "LOOP START" label (left)
- Timeline track with draggable handle
- "LOOP END" label (right)
- Animated progress indicator

## CSS Classes
- Row 1: `.top-bar`
- Row 2: `.player-tabs-section`
- Row 3: `.drum-kit-section`
- Row 4: `.pattern-groups-section`
- Row 5: `.pattern-matrix-section`
- Row 6: `.loop-section`

This structure should be used for all future discussions about the interface layout.
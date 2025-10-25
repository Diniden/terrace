# Basis Selection Feature Implementation

## Overview
Implemented a UI feature in the FactView component that allows users to set a fact's basis when it doesn't have one.

## Feature Details

### When to Show
The basis selection feature appears when:
- A fact has no basis (`!fact.basisId`)
- The fact's corpus has a parent corpus (`fact.corpus?.basisCorpusId` exists)

### User Flow

1. **Initial State - No Basis**
   - User sees an empty area in the Basis Chain section
   - A centered "+" button is displayed
   - Label above says "Set basis"

2. **Selection Mode**
   - User clicks the "+" button
   - The section expands to show ALL facts from the parent corpus
   - Each fact displays:
     - Statement text
     - State indicator (colored bar on left)
     - No action buttons (simplified read-only display)
   - A "Cancel" button appears in the header

3. **Setting a Basis**
   - User hovers over any fact (hover state shows scale effect)
   - User clicks the desired fact
   - API call updates the fact with the selected basis
   - View refreshes to show the normal basis chain

## Implementation Files

### 1. FactView.tsx
**New State Variables:**
- `isSelectingBasis`: boolean - tracks if user is in selection mode
- `parentCorpusFacts`: Fact[] - stores fetched facts from parent corpus

**New Handlers:**
- `handleOpenBasisSelection()`: Fetches parent corpus facts and enters selection mode
- `handleSelectBasis(selectedFactId)`: Updates fact with selected basis via API
- `handleCancelBasisSelection()`: Exits selection mode without changes

**UI Sections:**
1. Set Basis Button (when no basis and not selecting)
2. Basis Selection List (when no basis and selecting)
3. Normal Basis Chain (when basis exists)

### 2. FactView.css
**New CSS Classes:**

**Set Basis Container:**
- `.factView__setBasisContainer` - Centers the button and label
- `.factView__setBasisLabel` - Styles the "Set basis" label
- `.factView__setBasisButton` - Styles the "+" button (40x40px)

**Basis Selection:**
- `.factView__cancelBasisButton` - Styles the cancel button in header
- `.factView__basisSelectableContainer` - Wrapper for each selectable fact
- `.factView__basisSelectableFactCard` - Card styling for parent facts
- `.factView__basisSelectableStateIndicator` - Colored state bar (8px wide)
- `.factView__basisSelectableContent` - Fact statement text styling

**Hover Effects:**
- Scale transform on hover (1.02x)
- Border color change on hover
- Box shadow enhancement on hover

### 3. FactView.stories.tsx
**Updated Mocks:**
- Added `getOneWithRelationships` mock returning fact without basis
- Added `getAll` mock returning parent corpus facts
- Added `corpusesApi` mock for corpus hierarchy
- Updated `update` mock to handle `basisId` parameter

**New Story:**
- `NoBasisWithParent`: Demonstrates the basis selection feature

## API Integration

**Endpoints Used:**
1. `GET /facts?corpusId={parentCorpusId}` - Fetch parent corpus facts
2. `PATCH /facts/:id` with `{ basisId: selectedFactId }` - Set the basis
3. `GET /facts/:id/relationships` - Reload fact with updated basis chain

## Technical Details

### Data Flow
1. User clicks "+" button → `handleOpenBasisSelection()`
2. Fetch facts from `fact.corpus.basisCorpusId`
3. Store in `parentCorpusFacts` state
4. Set `isSelectingBasis` to true
5. UI shows selectable fact list
6. User clicks fact → `handleSelectBasis(factId)`
7. API call: `factsApi.update(fact.id, { basisId: factId })`
8. Reload fact data: `loadFactData()`
9. Clear selection state

### Styling Approach
- Uses BEM naming convention for all CSS classes
- All colors and spacing use CSS variables from theme
- Responsive hover states for better UX
- Scrollable list for many parent facts
- Simplified fact cards (no edit buttons)

## User Experience

**Visual Feedback:**
- Clear "Set basis" label indicates what the button does
- Hover effects show which fact will be selected
- State indicators show fact states using color-coded bars
- Cancel button allows backing out of selection

**Interaction Design:**
- Single click to enter selection mode
- Single click to select a fact
- Automatic refresh after selection
- No confirmation dialog (quick action)

## Future Enhancements

Potential improvements:
1. Search/filter parent facts by statement text
2. Show fact context badges in selection list
3. Preview mode (hover to see basis chain preview)
4. Keyboard navigation for selection
5. Undo/change basis action after setting

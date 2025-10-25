# Basis Selection UI Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ FactView - Fact without Basis                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐                                   │
│  │  Selected Fact      │                                   │
│  │  ┌───────────────┐  │                                   │
│  │  │ "My fact"     │  │                                   │
│  │  │ [READY]       │  │                                   │
│  │  └───────────────┘  │                                   │
│  └─────────────────────┘                                   │
│                                                             │
│  ─────────────────────────── (separator)                   │
│                                                             │
│  ┌─────────────────────┐                                   │
│  │   Set basis         │  ← Label                          │
│  │                     │                                   │
│  │      ┌───┐          │                                   │
│  │      │ + │          │  ← Clickable button               │
│  │      └───┘          │                                   │
│  └─────────────────────┘                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

                    ↓ (User clicks +)

┌─────────────────────────────────────────────────────────────┐
│ FactView - Basis Selection Mode                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐                                   │
│  │  Selected Fact      │                                   │
│  │  ┌───────────────┐  │                                   │
│  │  │ "My fact"     │  │                                   │
│  │  │ [READY]       │  │                                   │
│  │  └───────────────┘  │                                   │
│  └─────────────────────┘                                   │
│                                                             │
│  ─────────────────────────── (separator)                   │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ Select Basis          [Cancel]      │  ← Header         │
│  ├─────────────────────────────────────┤                   │
│  │ ┌─────────────────────────────────┐ │  ← Scrollable     │
│  │ │█│ Parent fact 1         │ │     │ │     list          │
│  │ │ │ [CONFIRMED]           │ │     │ │                   │
│  │ └─────────────────────────────────┘ │                   │
│  │                                     │                   │
│  │ ┌─────────────────────────────────┐ │                   │
│  │ │█│ Parent fact 2         │ │     │ │  ← Hover shows    │
│  │ │ │ [READY]               │ │     │ │     scale effect  │
│  │ └─────────────────────────────────┘ │                   │
│  │                                     │                   │
│  │ ┌─────────────────────────────────┐ │                   │
│  │ │█│ Parent fact 3         │ │     │ │                   │
│  │ │ │ [CLARIFY]             │ │     │ │                   │
│  │ └─────────────────────────────────┘ │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

                    ↓ (User clicks a fact)

┌─────────────────────────────────────────────────────────────┐
│ FactView - Basis Set (Normal View)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐                                   │
│  │  Selected Fact      │                                   │
│  │  ┌───────────────┐  │                                   │
│  │  │ "My fact"     │  │                                   │
│  │  │ [READY]       │  │                                   │
│  │  └───────────────┘  │                                   │
│  └─────────────────────┘                                   │
│                                                             │
│  ─────────────────────────── (separator)                   │
│                                                             │
│  ┌─────────────────────┐                                   │
│  │   Basis Chain       │  ← Header                         │
│  ├─────────────────────┤                                   │
│  │ Parent Corpus       │  ← Corpus label                   │
│  │ ┌───────────────┐   │                                   │
│  │ │█ Parent fact 2│   │  ← Selected basis fact            │
│  │ │  [READY]      │   │                                   │
│  │ │  [Edit] [View]│   │                                   │
│  │ └───────────────┘   │                                   │
│  └─────────────────────┘                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Component State Flow

```
State 1: No Basis, Not Selecting
├─ Condition: !fact.basisId && !isSelectingBasis && fact.corpus?.basisCorpusId
├─ Display: "+ Set basis" button
└─ Action: Click → handleOpenBasisSelection()

State 2: No Basis, Selecting
├─ Condition: !fact.basisId && isSelectingBasis
├─ Display: List of parent corpus facts with Cancel button
├─ Actions:
│  ├─ Click fact → handleSelectBasis(factId)
│  └─ Click Cancel → handleCancelBasisSelection()
└─ Data: parentCorpusFacts array populated from API

State 3: Has Basis
├─ Condition: fact.basisId
├─ Display: Normal basis chain with full FactCard components
└─ Data: basisChain array from fact.basisChain
```

## API Call Sequence

```
1. User opens basis selection:
   handleOpenBasisSelection()
   ├─ Check: fact.corpus?.basisCorpusId exists
   ├─ API: GET /facts?corpusId={basisCorpusId}
   ├─ Set: parentCorpusFacts = response.data
   └─ Set: isSelectingBasis = true

2. User selects a basis fact:
   handleSelectBasis(selectedFactId)
   ├─ API: PATCH /facts/{factId} { basisId: selectedFactId }
   ├─ Call: loadFactData() (reload with relationships)
   ├─ Set: isSelectingBasis = false
   └─ Set: parentCorpusFacts = []

3. User cancels selection:
   handleCancelBasisSelection()
   ├─ Set: isSelectingBasis = false
   └─ Set: parentCorpusFacts = []
```

## CSS Class Structure

```
Basis Selection UI:

.factView__setBasisContainer
├─ .factView__setBasisLabel ("Set basis" text)
└─ .factView__setBasisButton (+ button)

.factView__basisChainSection
├─ .factView__regionHeader ("Select Basis" text)
│  └─ .factView__cancelBasisButton (Cancel button)
└─ .factView__basisColumnContent (scrollable container)
   └─ .factView__basisSelectableContainer (each fact wrapper)
      └─ .factView__basisSelectableFactCard
         ├─ .factView__basisSelectableStateIndicator (color bar)
         └─ .factView__basisSelectableContent (statement text)
```

## User Interaction Details

### Hover States
- **Container**: `transform: scale(1.02)` on hover
- **Card**: Border color changes from grey-200 to grey-400
- **Card**: Box shadow increases from sm to md
- **Cursor**: Changes to pointer to indicate clickability

### Click Behavior
- **+ Button**: Opens selection mode (async operation)
- **Fact Card**: Sets basis and reloads (async operation)
- **Cancel Button**: Closes selection mode (instant)

### Visual Feedback
- State indicator shows fact state using color-coded bar
- Empty state message if no parent facts exist
- Scrollable list if many parent facts available
- Simplified cards (no edit buttons) for cleaner selection

## Accessibility Considerations

### Keyboard Navigation
- Button is keyboard accessible (Tab to focus, Enter to activate)
- Cancel button is keyboard accessible
- TODO: Add keyboard navigation for fact selection (Up/Down arrows)

### Screen Readers
- Label "Set basis" describes button purpose
- TODO: Add aria-label to fact cards in selection mode
- TODO: Add role="listbox" to selection container

### Visual Indicators
- Clear state indicators with color coding
- Hover states provide visual feedback
- Cancel button is clearly visible in header

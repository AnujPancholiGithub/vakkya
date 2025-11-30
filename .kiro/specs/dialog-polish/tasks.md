# Implementation Plan

- [x] 1. Enhance base dialog component styling
  - [x] 1.1 Update DialogOverlay in dialog.tsx
    - Change overlay opacity from bg-black/80 to bg-black/60
    - Ensure fade animations remain intact
    - _Requirements: 1.1, 5.1_
  - [x] 1.2 Update DialogContent in dialog.tsx
    - Apply bg-zinc-900 background color
    - Add border border-zinc-800 for subtle border
    - Change to rounded-xl for softer corners
    - Add shadow-2xl shadow-black/50 for refined shadow
    - Remove default p-6 padding (handle in sections)
    - _Requirements: 1.2, 1.3, 5.2, 5.3_
  - [x] 1.3 Update DialogClose button styling
    - Add hover:bg-zinc-800 background on hover
    - Change text color to text-zinc-400 hover:text-zinc-200
    - Add transition-colors for smooth hover
    - _Requirements: 1.4_
  - [x] 1.4 Update DialogHeader layout
    - Change to flex items-start gap-3 p-6 pb-0
    - Support horizontal icon + text layout
    - _Requirements: 3.3_
  - [x] 1.5 Update DialogFooter layout
    - Change to flex justify-end gap-3 p-6 pt-4
    - Right-align buttons with consistent spacing
    - _Requirements: 4.1_

- [x] 1.6 Write unit test for dialog overlay opacity
  - **Property 1: Dialog Overlay Opacity**
  - **Validates: Requirements 1.1**

- [x] 2. Enhance input component styling
  - [x] 2.1 Update Input component in input.tsx
    - Apply bg-zinc-950 background color
    - Add border border-zinc-800
    - Add focus:ring-2 focus:ring-primary focus:border-primary
    - Add transition-colors for smooth focus
    - _Requirements: 2.1, 2.2_

- [x] 2.2 Write unit test for input focus ring
  - **Property 2: Input Focus Ring Presence**
  - **Validates: Requirements 2.1**

- [x] 3. Update create-project-dialog layout
  - [x] 3.1 Refine dialog header structure
    - Update icon container to rounded-lg bg-primary/10
    - Ensure title uses text-lg font-semibold text-zinc-100
    - Ensure description uses text-sm text-zinc-400 mt-1
    - _Requirements: 3.1, 3.2_
  - [x] 3.2 Refine form content section
    - Wrap form fields in p-6 space-y-4 container
    - Update label to text-sm font-medium text-zinc-300
    - Update helper text to text-xs text-zinc-500
    - _Requirements: 2.3, 2.4_
  - [x] 3.3 Refine footer button styling
    - Ensure Cancel uses variant="ghost"
    - Ensure primary button shows loading state correctly
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 4. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


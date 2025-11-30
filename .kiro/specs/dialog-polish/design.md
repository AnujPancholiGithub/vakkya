# Design Document: Dialog Polish

## Overview

This design document outlines the technical approach for polishing dialog/popup components in the Vakkya Dashboard to achieve a Linear-inspired refined aesthetic. The improvements focus on visual refinement of existing components without introducing new dependencies or architectural changes.

All changes enhance the existing shadcn/ui Dialog component and related form elements using Tailwind CSS classes.

## Architecture

### Component Enhancement Strategy

The implementation follows a minimal-change approach:

1. **Modify existing dialog.tsx** - Update base dialog styling
2. **Modify existing input.tsx** - Enhance focus states and backgrounds
3. **Update create-project-dialog.tsx** - Apply refined layout patterns
4. **No new components** - All changes are CSS/styling refinements

### File Structure

```
apps/dashboard/
├── components/
│   ├── ui/
│   │   ├── dialog.tsx           # ENHANCE - overlay, container, animations
│   │   └── input.tsx            # ENHANCE - focus ring, background
│   └── projects/
│       └── create-project-dialog.tsx  # ENHANCE - layout refinements
└── app/
    └── globals.css              # ENHANCE - add animation keyframes if needed
```

## Components and Interfaces

### 1. Dialog Component Enhancements

Update the base dialog component with refined styling:

```typescript
// components/ui/dialog.tsx - Key changes

// DialogOverlay - Reduce opacity
const DialogOverlay = React.forwardRef<...>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/60',  // Changed from bg-black/80
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))

// DialogContent - Enhanced container styling
const DialogContent = React.forwardRef<...>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Content
    className={cn(
      'fixed left-[50%] top-[50%] z-50 w-full max-w-md',
      'translate-x-[-50%] translate-y-[-50%]',
      // Enhanced styling
      'bg-zinc-900 border border-zinc-800',
      'rounded-xl shadow-2xl shadow-black/50',
      'p-0',  // Remove default padding, handle in content sections
      // Animations
      'duration-200',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
      'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
      'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
      className
    )}
    {...props}
  >
    {children}
    <DialogPrimitive.Close className={cn(
      'absolute right-4 top-4',
      'rounded-md p-1',
      'text-zinc-400 hover:text-zinc-200',
      'hover:bg-zinc-800',
      'transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-zinc-900'
    )}>
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  </DialogPrimitive.Content>
))

// DialogHeader - Horizontal layout with icon support
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-start gap-3 p-6 pb-0', className)} {...props} />
)

// DialogFooter - Right-aligned with gap
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex justify-end gap-3 p-6 pt-4', className)} {...props} />
)
```

### 2. Input Component Enhancements

Update input styling for better focus states:

```typescript
// components/ui/input.tsx - Key changes

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md px-3 py-2',
          // Enhanced background
          'bg-zinc-950 border border-zinc-800',
          'text-sm text-zinc-100 placeholder:text-zinc-500',
          // Enhanced focus ring - blue/primary
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0',
          'focus:border-primary',
          // Transitions
          'transition-colors',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
```

### 3. Create Project Dialog Layout

Apply refined layout to the create project dialog:

```typescript
// components/projects/create-project-dialog.tsx - Structure

<Dialog open={open} onOpenChange={handleClose}>
  <DialogContent>
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Header with icon */}
      <DialogHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <DialogTitle className="text-lg font-semibold text-zinc-100">
            Create Voice Agent
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400 mt-1">
            Give your agent a name to get started
          </DialogDescription>
        </div>
      </DialogHeader>

      {/* Form content */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-zinc-300">
            Project Name
          </Label>
          <Input
            id="name"
            placeholder="e.g., Acme Support Agent"
            {...register('name')}
          />
          <p className="text-xs text-zinc-500">
            You can change this later in project settings
          </p>
        </div>
      </div>

      {/* Footer actions */}
      <DialogFooter>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Create & Continue'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

## Data Models

No new data models required. This is purely a styling enhancement.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the acceptance criteria for this feature are primarily CSS styling requirements that are best verified through example-based unit tests rather than property-based tests. The criteria test specific styling classes and visual states rather than universal properties across input ranges.

### Property 1: Dialog Overlay Opacity
*For any* rendered dialog, the overlay element SHALL have the reduced opacity class (bg-black/60) applied.
**Validates: Requirements 1.1**

### Property 2: Input Focus Ring Presence
*For any* input element in a dialog, when focused, the input SHALL have the primary color focus ring classes applied.
**Validates: Requirements 2.1**

Note: Most acceptance criteria in this feature are styling examples that verify specific CSS classes are applied. These are implemented as unit tests verifying component output rather than property-based tests, as they don't involve universal properties across varying inputs.

## Error Handling

No new error handling required. Existing form validation and error states remain unchanged.

## Testing Strategy

### Dual Testing Approach

**Unit Tests** verify specific styling examples:
- Dialog overlay has correct opacity class
- Dialog container has border, shadow, and background classes
- Input has focus ring classes when focused
- Footer buttons are right-aligned
- Loading state disables buttons

**Property-Based Tests**: Limited applicability for this feature since criteria are CSS styling examples rather than universal properties. The two properties identified above can be tested as unit tests verifying class presence.

### Testing Framework

- **Unit Tests**: Vitest with React Testing Library
- **Test Location**: Co-located with source files as `*.test.tsx`

### Test Annotations

Each test will be tagged with:
```typescript
// **Feature: dialog-polish, Property {number}: {property_text}**
// **Validates: Requirements X.Y**
```


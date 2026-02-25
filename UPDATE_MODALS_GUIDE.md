# Unsaved Changes Modal Integration Guide

This guide documents how to integrate unsaved changes detection into all Add/Edit modal components.

## Modals Already Updated ✅
1. AddEventModal - /src/pages/Dashboard/components/AddEventModal.tsx
2. EditEventModal - /src/pages/Dashboard/components/EditEventModal.tsx
3. AddUserModal - /src/pages/Users/components/AddUserModal.tsx

## Modals Remaining to Update 🔄
1. EditUserModal - /src/pages/Users/components/EditUserModal.tsx
2. AddAdminModal - /src/pages/Users/components/AddAdminModal.tsx
3. AddClientModal - /src/pages/ClientsBrands/components/AddClientModal.tsx
4. EditClientModal - /src/pages/ClientsBrands/components/EditClientModal.tsx
5. CreateNotificationModal - /src/pages/Notifications/components/CreateNotificationModal.tsx
6. CreateTriviaModal - /src/pages/Trivia/components/CreateTriviaModal.tsx
7. EditTriviaModal - /src/pages/Trivia/components/EditTriviaModal.tsx
8. AddCategoryModal - /src/pages/Categories/components/AddCategoryModal.tsx
9. EditCategoryModal - /src/pages/Categories/components/EditCategoryModal.tsx
10. AddLocationModal - /src/pages/Locations/components/AddLocationModal.tsx
11. EditLocationModal - /src/pages/Locations/components/EditLocationModal.tsx

## Integration Pattern

### 1. Import Required Dependencies
```typescript
import { useRef } from 'react' // Add to existing imports
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges'
import { UnsavedChangesModal } from '../../../components'
```

### 2. Add State Variables
```typescript
const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)
const [isSubmitting, setIsSubmitting] = useState(false) // If not already present
const initialDataRef = useRef(initialFormData) // Store initial data for comparison

const hasUnsavedChanges = useUnsavedChanges(formData, initialDataRef.current, isOpen)
```

### 3. Update Form Reset Logic
When modal opens, update initialDataRef:
```typescript
useEffect(() => {
  if (isOpen) {
    // ... existing logic ...
    initialDataRef.current = newFormData // Set initial data reference
  }
}, [isOpen])
```

### 4. Add Close Handler
```typescript
const handleClose = () => {
  if (hasUnsavedChanges && !isSubmitting) {
    setShowUnsavedChangesModal(true)
  } else {
    onClose()
  }
}

const handleDiscardChanges = () => {
  setShowUnsavedChangesModal(false)
  onClose()
}
```

### 5. Update Submit Handler
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // ... validation logic ...
  
  setIsSubmitting(true)
  try {
    await onSave(formData)
    // Close unsaved changes modal if it's open
    setShowUnsavedChangesModal(false)
    onClose()
  } catch (error) {
    // Handle error
  } finally {
    setIsSubmitting(false)
  }
}
```

### 6. Update JSX
Add UnsavedChangesModal component:
```tsx
<>
  <UnsavedChangesModal
    isOpen={showUnsavedChangesModal}
    onClose={() => setShowUnsavedChangesModal(false)}
    onDiscard={handleDiscardChanges}
  />
  
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Backdrop - use handleClose instead of onClose */}
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={isSubmitting ? undefined : handleClose}
    />
    
    {/* Modal content */}
    <div className="relative bg-white rounded-lg shadow-xl ...">
      {/* Header - use handleClose instead of onClose */}
      <button
        onClick={handleClose}
        disabled={isSubmitting}
        className="..."
      >
        <Icon icon="mdi:close" />
      </button>
      
      {/* Form - add data-modal-form attribute */}
      <form onSubmit={handleSubmit} data-modal-form className="...">
        {/* ... form fields ... */}
        
        {/* Cancel button - use handleClose */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        
        {/* Submit button - add loading state */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="..."
        >
          {isSubmitting && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />}
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  </div>
</>
```

## Key Points
1. **Replace all `onClose` calls** with `handleClose` in backdrop, close button (X), and Cancel button
2. **Add `data-modal-form`** attribute to form for identification
3. **Disable buttons** during submission to prevent double-click
4. **Show loading spinner** in submit button during save
5. **Track initial data** properly for edit modals vs add modals
6. **Close unsaved modal** after successful save

## Testing Checklist
For each modal:
- [ ] Make changes and click outside modal → Should show confirmation
- [ ] Make changes and click close button → Should show confirmation
- [ ] Make changes and click Cancel → Should show confirmation
- [ ] Click "Discard Changes" → Modal closes without saving
- [ ] Click "Continue Editing" → Returns to form (user can then use the form's Save button)
- [ ] Make no changes and close → No confirmation (closes immediately)
- [ ] During save operation → All buttons disabled

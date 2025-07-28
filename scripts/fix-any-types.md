# TypeScript Any Type Fix Guide

## Summary of Changes Made

### 1. Enhanced Type Definitions (lib/types.ts)

- Added error handling types: `ErrorWithMessage`, `ApiError`,
  `getErrorMessage()` helper
- Added chart/analytics types: `ChartData`, `ServiceChartData`, `TierChartData`,
  `TimeSlotChartData`
- Added calendar types: `CalendarEvent`, `CalendarEventProps`,
  `CalendarToolbarProps`
- Added form types: `ReservationFormData`, `ContactFormData`
- Added API response types: `ApiResponse<T>`
- Added local storage types: `StoredUser`
- Added Firebase types: `FirestoreTimestamp` with type guard

### 2. Fixed Files

#### Error Handling Pattern

- **Before**: `catch (error: any) { error.message }`
- **After**: `catch (error) { getErrorMessage(error) }` or
  `error instanceof Error ? error.message : 'Default message'`

Fixed in:

- `/lib/firebase/auth.ts`
- `/app/api/auth/login/route.ts`
- `/app/login/page.tsx`

#### Component Props Pattern

- **Before**: `(event: any) => {}`
- **After**: `(event: CalendarEvent) => {}`

Fixed in:

- `/components/admin/ReservationCalendar.tsx`
- `/components/ui/SwipeableCard.tsx`
- `/components/reservation/TimeSlots.tsx`

#### Form Data Pattern

- **Before**: `formData: any`
- **After**: `formData: ReservationFormData` or `ContactFormData`

Fixed in:

- `/components/home/ContactSection.tsx`
- `/app/reservation/page.tsx`

#### Array Filtering Pattern

- **Before**: `.filter((item: any) => ...)`
- **After**: `.filter((item: User) => ...)` or specific type

Fixed in:

- `/app/admin/analytics/page.tsx`
- `/app/admin/page.tsx`

#### State Pattern

- **Before**: `useState<any[]>([])`
- **After**: `useState<SpecificType[]>([])`

Fixed in:

- `/app/admin/analytics/page.tsx`
- `/app/register/page.tsx`
- `/components/reservation/TimeSlots.tsx`

## Remaining Patterns to Fix

### 1. API Routes Error Handling

Replace all instances of:

```typescript
} catch (error: any) {
  return errorResponse(error.message || 'Default message')
}
```

With:

```typescript
} catch (error) {
  return errorResponse(error instanceof Error ? error.message : 'Default message')
}
```

### 2. Local Storage Parsing

Replace:

```typescript
JSON.parse(localStorage.getItem('key') || '[]').map((item: any) => ...)
```

With:

```typescript
JSON.parse(localStorage.getItem('key') || '[]').map((item: SpecificType) => ...)
```

### 3. Event Handlers

Replace:

```typescript
onClick={(e: any) => ...}
onChange={(value: any) => ...}
```

With proper event types:

```typescript
onClick={(e: React.MouseEvent<HTMLButtonElement>) => ...}
onChange={(value: string | number) => ...}
```

### 4. API Response Data

Create typed API client functions instead of using `any` for response data.

### 5. Test Files

Update test files to use proper types for mocks and assertions.

## Best Practices Going Forward

1. **Never use `any`** - Use `unknown` if type is truly unknown
2. **Create interfaces** for all data structures
3. **Use type guards** for runtime type checking
4. **Enable strict mode** in tsconfig.json
5. **Use generic types** for reusable components
6. **Document complex types** with JSDoc comments

## Tools to Help

1. **ESLint rule**: `@typescript-eslint/no-explicit-any`
2. **TypeScript compiler option**: `"noImplicitAny": true`
3. **VS Code extension**: "TypeScript Hero" for auto-importing types

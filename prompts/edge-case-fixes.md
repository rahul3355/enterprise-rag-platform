# COMPREHENSIVE EDGE CASE FIXES - ENTERPRISE RAG APP

You are fixing ALL edge cases in the Enterprise RAG application. Use ultrathink methodology - anticipate what can go wrong at every step.

## CRITICAL: Your job is to make the app work for ALL user scenarios with ZERO user-facing errors.

---

## SECTION 1: AUTH & SECURITY - ALREADY FIXED

The JWT verification and tenant auto-creation are working. Do NOT modify these unless broken.

---

## SECTION 2: UI EDGE CASES - FIX THESE

### 2.1 Dashboard Sidebar (STILL NEEDS FIX)
**Problem:** Sidebar appears even when no workspaces exist, giving users false expectations.

**Fix:** Update `frontend/components/DashboardShell.tsx`:
- Accept optional `workspaces` prop or use context
- If no workspaces, show onboarding prompts in sidebar
- Show badges/warnings on menu items that require workspaces

### 2.2 All Empty States - VERIFY WORKING
Check these pages show proper empty states:
- `/dashboard` - Shows welcome card when no workspaces (ALREADY EXISTS - verify)
- `/chat` - Shows "No Workspaces Yet" card (ALREADY EXISTS - verify)  
- `/upload` - Shows "No Workspaces Yet" card (ALREADY EXISTS - verify)
- `/workspaces` - Shows "Create first workspace" (ALREADY EXISTS - verify)

### 2.3 WorkspaceSelector Edge Cases
**File:** `frontend/components/WorkspaceSelector.tsx`

**Requirements:**
1. If NO workspaces → Return null (don't show selector)
2. If workspaces exist but none selected → Auto-select first one

### 2.4 DocumentUploader Edge Cases
**File:** `frontend/components/DocumentUploader.tsx`

**Requirements:**
1. If no workspace selected → Disable drag-drop, show message
2. If upload fails → Show clear error with retry option
3. File type validation → Show which types are allowed

---

## SECTION 3: API ERROR HANDLING - FIX THIS

### 3.1 Enhance fetchWithAuth
**File:** `frontend/lib/api.ts`

**Current code (lines 1-27):**
```typescript
async function fetchWithAuth<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || `Request failed: ${res.status}`)
  }

  return res.json()
}
```

**Add better error handling for:**
- 401 Unauthorized → Throw error with "Please log in again" message
- 403 Forbidden → Throw error with "You don't have permission" message  
- 500+ errors → Throw error with "Server error. Try again later" message
- Network error → Catch and throw "Network error. Check connection" message

---

## SECTION 4: TESTING VERIFICATION

Create a test plan (just verify in your head these work):

### New User Flow
1. Sign up → Dashboard shows "Welcome" card
2. Sidebar shows prompts to create workspace
3. Chat page shows "No Workspaces Yet"
4. Upload page shows "No Workspaces Yet"
5. Workspaces page shows "Create first workspace"
6. Create workspace → Works

### Returning User Flow  
1. Login → Dashboard shows stats
2. Can access all pages
3. Chat works with documents

### Edge Cases
1. No workspaces → Try chat → Shows empty card (NOT ERROR)
2. No workspaces → Try upload → Shows empty card (NOT ERROR)
3. Token expires → Should show appropriate error

---

## FILES TO EXAMINE & FIX IF NEEDED

1. `frontend/components/DashboardShell.tsx` - Sidebar empty states
2. `frontend/components/WorkspaceSelector.tsx` - Empty handling  
3. `frontend/components/DocumentUploader.tsx` - Upload edge cases
4. `frontend/lib/api.ts` - API error handling
5. `frontend/app/chat/page.tsx` - Empty state (verify lines 79-95 work)
6. `frontend/app/upload/page.tsx` - Empty state (verify works)
7. `frontend/app/dashboard/page.tsx` - Welcome card (verify works)

---

## SUCCESS CRITERIA

After your review and fixes, ALL these should work WITHOUT ERRORS:

1. ✅ New user signs up → No errors, welcome card shows
2. ✅ Create first workspace → Works
3. ✅ Upload document → Works
4. ✅ Chat → Works
5. ✅ No workspace → All pages show helpful empty state (NOT ERROR)
6. ✅ All API errors → User-friendly messages (NOT RAW ERROR)

---

## INSTRUCTIONS

1. Read each file listed above
2. Identify if it needs fixing or if it's already correct
3. Make comprehensive fixes
4. Verify error messages are user-friendly
5. DO NOT break working functionality (JWT, tenant creation)

Start by reading the files and checking their current state.

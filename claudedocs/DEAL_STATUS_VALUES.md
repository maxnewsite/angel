# Deal Status Values Reference

## Valid Status Enum Values

The `deals.status` field uses these exact values:

### Founder/Dealflow Workflow
- **`draft`** - Initial state, deal being prepared by founder
- **`submitted`** - Deal submitted by founder, waiting for dealflow review
- **`screening_in_progress`** - Dealflow manager actively screening the deal
- **`screening_rejected`** - Deal rejected during screening phase
- **`ic_in_review`** - Deal approved to IC, under IC review
- **`published`** - Deal approved by IC and published to investors

## Status Transitions

```
Founder Flow:
  draft → submitted → (dealflow assigns) → screening_in_progress

Dealflow Manager Flow (1:1 submissions):
  (create) → screening_in_progress

Screening Decision:
  screening_in_progress → ic_in_review (approved)
  screening_in_progress → screening_rejected (rejected)

IC Decision:
  ic_in_review → published (approved)
  ic_in_review → screening_rejected (rejected)
```

## Database Fields

- **`deals.status`**: Current deal status (TEXT with valid values above)
- **`deals.screening_decision`**: `"approve"` or `"reject"` (set when screening finalized)
- **`deals.screening_completed_at`**: Timestamp when screening was finalized

## Code Usage

**✅ Correct:**
```typescript
status: "screening_in_progress"
status: "ic_in_review"
status: "screening_rejected"
```

**❌ Wrong:**
```typescript
status: "screening"  // Invalid!
status: "ic_review"  // Invalid!
status: "rejected"   // Invalid! (use "screening_rejected")
```

## Related Files

- `supabase/functions/dealflow-transition/index.ts` - Status transitions
- `supabase/functions/finalize-screening/index.ts` - Screening finalization
- `app/app/deals/new/page.tsx` - Dealflow manager deal creation
- `app/app/rejected/page.tsx` - Rejected deals archive

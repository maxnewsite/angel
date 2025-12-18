# Dealflow Controls Guide

## Overview
Dealflow controls are context-aware buttons that appear to dealflow managers and admins to move deals through the screening workflow.

## When Controls Appear

### ✅ Controls ARE Visible
- **User Role**: dealflow_manager OR admin
- **Deal Status**: draft, submitted, OR screening_in_progress
- **Purpose**: Move deal to next stage in workflow

### ❌ Controls NOT Visible
- **Published deals**: Workflow complete, deal is live
- **IC in review**: IC owns the decision at this stage
- **Screening rejected**: Deal is archived
- **Other roles**: Only dealflow managers and admins have these controls

## Available Actions by Status

### Status: `draft` or `submitted`
**Available Button:**
- **"Start screening"** → Moves deal to `screening_in_progress`

**When to use:**
- Founder has submitted deal
- Initial triage is complete
- Ready to begin detailed screening

### Status: `screening_in_progress`
**Available Buttons:**
- **"Approve to IC"** → Moves deal to `ic_in_review`
- **"Reject (screening)"** → Moves deal to `screening_rejected`

**When to use:**
- **Approve to IC**: Screening complete, scores entered, ready for IC decision
- **Reject**: Deal doesn't meet criteria, archive it

### Status: `ic_in_review`
**No dealflow controls shown**

**Why:**
- IC members and IC chair own this stage
- Dealflow manager's job is done
- IC vote and chair decision determine next steps

### Status: `published`
**No dealflow controls shown**

**Why:**
- Deal is live and visible to investors
- Workflow is complete
- Focus shifts to investor interest tracking (Portfolio view)

### Status: `screening_rejected`
**No dealflow controls shown**

**Why:**
- Deal is archived
- Visible in "Rejected" section for reference
- Cannot be reactivated (would need new submission)

## Complete Workflow

```
draft/submitted
    ↓
    [Start screening]
    ↓
screening_in_progress
    ↓
    [Approve to IC] ─────→ ic_in_review
         OR                     ↓
    [Reject]              [IC Chair Decision]
         ↓                     ↓
  screening_rejected         published
         ↓                     ↓
    (Archived)          (Live to investors)
```

## Button Behavior

### Start Screening
- **Action**: Changes status to `screening_in_progress`
- **Effect**:
  - Enables screening editor
  - AI screening available
  - Criteria scoring unlocked
  - Red/green flags can be added

### Approve to IC
- **Action**: Changes status to `ic_in_review`
- **Requirements**:
  - Screening should be complete
  - Scores entered (optional but recommended)
  - Summary memo written
- **Effect**:
  - Deal appears in IC queue
  - IC members can vote
  - IC chair can make final decision
  - Dealflow manager can no longer edit screening

### Reject (Screening)
- **Action**: Changes status to `screening_rejected`
- **Effect**:
  - Deal moves to "Rejected" section
  - Screening data preserved for reference
  - No longer in active workflow
  - Cannot be edited or reactivated

## Why Context-Aware Controls?

### Problem (Before Fix)
All three buttons showed on every deal regardless of status:
- ❌ Confusing: "Start screening" on already-screened deal
- ❌ Error-prone: Could approve published deal to IC again
- ❌ Cluttered: Irrelevant options visible
- ❌ Poor UX: User doesn't know which button to use

### Solution (After Fix)
Only relevant buttons show based on current status:
- ✅ Clear: Only see what you can do right now
- ✅ Safe: Can't make invalid transitions
- ✅ Clean: Minimal, focused interface
- ✅ Guided: Status message shows current stage

## Who Can Save Interest?

**Previously**: Only investors could save interest
**Now**: Anyone can save interest (including internal roles)

**Why the change:**
- Dealflow managers might want to invest personally
- IC members might be angel investors
- Allows internal team to participate in deals
- More flexible, real-world aligned

## Edge Cases

### Deal Stuck in Screening
**Symptom**: Can't find "Approve to IC" button
**Cause**: Deal might be in different status
**Fix**: Check deal status badge at top of page

### Button Clicked but Nothing Happens
**Symptom**: Button doesn't work
**Cause**: Edge function error or network issue
**Fix**: Check browser console for errors

### Want to Un-reject a Deal
**Symptom**: Rejected deal by mistake
**Cause**: Workflow is one-way by design
**Fix**: Founder must submit new deal OR admin can manually change status in database

## Future Enhancements

- [ ] Bulk status transitions
- [ ] Deal assignment to specific analysts
- [ ] Automated workflow triggers
- [ ] Email notifications on status changes
- [ ] Approval workflows requiring multiple approvers
- [ ] Deal archival vs soft delete

## Related Documentation
- `DEAL_STATUS_VALUES.md` - All possible statuses
- `IC_WORKFLOW.md` - Complete workflow guide
- `SCREENING_FINALIZATION.md` - Screening completion process

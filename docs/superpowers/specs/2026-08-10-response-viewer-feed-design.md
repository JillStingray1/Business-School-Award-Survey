# Student Response Viewer Feed Design

## Goal

Redesign the Student Response Viewer as a compact moderation feed. The student and the student's comment are the primary content. The nominated teacher remains available for context but is visually secondary.

## Confirmed Database Context

- `nominations.approval_status` exists in Supabase and is queryable.
- Allowed values are `Pending`, `Approved`, and `Rejected`.
- Existing application IPC logic reads and updates this field by `nominations.id`.
- This work does not add or alter database fields or RLS policies.
- The updated `database.md` from `origin/main` will be synchronized into the local feature branch.

## Page Structure

The existing page header, response counts, refresh command, filters, sorting, and pagination remain in place. The response list changes from large information cards to a dense single-column feed.

Each survey post contains:

1. A small circular student avatar on the left.
2. The student name, labelled student ID, and submission time in one compact header line.
3. The complete supporting comment as the main visual content.
4. A status indicator and moderation controls in a compact footer.
5. A circular nominated-teacher icon fixed at the top-right edge.

Posts use a thin neutral divider or narrow grey separator band. They do not use large outer margins, tall metadata panels, or nested cards.

## Nominated Teacher Details

The teacher's identity is not shown directly in the post body. Hovering over or keyboard-focusing the teacher icon opens a small popover containing:

- Teacher name
- Unit code and unit name
- Staff role
- Teaching period

The popover must remain inside the visible page area and have an accessible label for keyboard and screen-reader users.

## Approval States

The three states use consistent text labels and distinct colours:

- `Pending`: amber status pill, amber left accent, and a subtle warm background. This is the strongest visual state because it requires action.
- `Approved`: green status pill and green left accent.
- `Rejected`: red status pill and red left accent.

The existing status filter continues to provide All, Pending, Approved, and Rejected. A separate reviewed/unreviewed filter is not added because it would duplicate the same state information.

## Moderation Actions

- Pending posts show `Approve` and `Reject` actions.
- Reject continues to require confirmation.
- Approved and Rejected posts show `Undo decision` instead of `Review`.
- Undo requires confirmation and writes `Pending` through the existing status-update IPC transaction.
- While an update is running, controls for that post show a loading state and cannot be triggered repeatedly.
- A successful update replaces the affected response in local state without reloading the whole page.
- A failed update leaves the previous status unchanged and displays the existing page-level error alert.

## Responsive Behaviour

Desktop layouts keep the avatar, comment, teacher icon, status, and actions on a compact row. On narrow screens, the student metadata and footer actions may wrap. The teacher icon remains at the upper-right of the post and the comment keeps the full available width.

## Scope Boundaries

This change does not modify the Supabase schema, RLS policies, nomination form, other Admin App pages, or shared navigation. It does not add social-media engagement controls. The Twitter/X reference applies only to information hierarchy and feed density.

## Verification

- Confirm the live Supabase field can be read without exposing credentials or nomination data.
- Build the renderer and complete Electron Forge packaging.
- Verify lecturer filtering, approval filtering, sorting, pagination, refresh, approve, reject, and undo interactions.
- Verify teacher details appear on mouse hover and keyboard focus.
- Check Pending, Approved, and Rejected posts at desktop and narrow widths.
- Confirm the final Git diff is limited to the Response Viewer, existing approval IPC/type files if required, the synchronized database documentation, and this design/plan documentation.

# Database Documentation

This document records the current database structure for the Teaching & Learning Award nomination system.

When any team member changes the database, this document must be updated at the same time.

---

## 1. Database Overview

The project uses a Supabase PostgreSQL database.

| Table           | Purpose                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `award_periods` | Stores the opening and closing dates for nomination and application periods.                                                   |
| `scholars`      | Stores nominatable teaching records. Each row represents a scholar/staff member teaching a unit in a specific teaching period. |
| `nominations`   | Stores nomination submissions made by students.                                                                                |

Important note: `scholars` is not only a staff-name list. It is a list of nominatable teaching options.

For example, if the same scholar teaches the same unit in two different teaching periods, there should be two rows in `scholars`.

---

## 2. Table Structure

## 2.1 `award_periods`

This table controls when nominations and applications are open.

| Column                 | Type                       | Required | Description                                                              |
| ---------------------- | -------------------------- | -------- | ------------------------------------------------------------------------ |
| `id`                   | `uuid`                     | Yes      | Database primary key for each award period.                              |
| `name`                 | `text`                     | Yes      | Name of the award period, such as `Semester 1` or `2026 Teaching Award`. |
| `nomination_open_at`   | `timestamp with time zone` | Yes      | Time when student nominations open.                                      |
| `nomination_close_at`  | `timestamp with time zone` | Yes      | Time when student nominations close.                                     |
| `application_open_at`  | `timestamp with time zone` | Yes      | Time when nominee applications open.                                     |
| `application_close_at` | `timestamp with time zone` | Yes      | Time when nominee applications close.                                    |
| `is_active`            | `boolean`                  | Yes      | Shows whether this award period is currently active.                     |
| `created_at`           | `timestamp with time zone` | Yes      | Record creation time.                                                    |
| `updated_at`           | `timestamp with time zone` | Yes      | Record update time.                                                      |

### Notes

- The frontend reads this table to check whether nominations are open.
- Only one award period should normally have `is_active = true`.
- If the frontend shows `Current nominations are not open`, check this table first.

---

## 2.2 `scholars`

This table stores nominatable teaching records.

Each row should represent:

```text
one scholar/staff member + one unit + one teaching period + one role
```

| Column            | Type                       | Required | Description                                                         |
| ----------------- | -------------------------- | -------- | ------------------------------------------------------------------- |
| `id`              | `bigint`                   | Yes      | Database primary key for this row. This is an internal database ID. |
| `scholar_id`      | `text`                     | Optional | Scholar or teaching staff's ID                                      |
| `name`            | `text`                     | Yes      | Scholar or teaching staff name.                                     |
| `unit`            | `text`                     | Yes      | Unit code, such as `BUSN1001`.                                      |
| `unit_name`       | `text`                     | Yes      | Full unit name.                                                     |
| `teaching_period` | `text`                     | Yes      | Teaching period, such as Semester 1, Semester 2, or Trimester.      |
| `role_of_unit`    | `text`                     | Yes      | The scholar's role in this unit.                                    |
| `Email`           | `text`                     | Yes      | The scholar's email, used for notifying them of their nomination    |

### Important Difference

| Field        | Meaning                                                                |
| ------------ | ---------------------------------------------------------------------- |
| `id`         | Internal database row ID. It identifies this specific teaching record. |
| `scholar_id` | Official scholar/staff ID. It identifies the actual person.            |

Example:

| id | scholar\_id | name     | unit     | teaching\_period | role\_of\_unit |
| -- | ----------- | -------- | -------- | ---------------- | -------------- |
| 1  | 00012345    | Jane Lee | ACCT1101 | Semester 1       | Lecturer       |
| 2  | 00012345    | Jane Lee | ACCT1101 | Semester 2       | Lecturer       |

This is valid because the same scholar can teach the same unit in different teaching periods.

### Notes

- Do not use `id` as the real scholar/staff ID.
- Use `scholar_id` when the system needs to identify the actual scholar.
- The frontend can read this table, so this table should not contain private identity information that should be hidden from public users.

---

## 2.3 `nominations`

This table stores nomination form submissions.

| Column              | Type                       | Required    | Description                                                                   |
| ------------------- | -------------------------- | ----------- | ----------------------------------------------------------------------------- |
| `id`                | `bigint`                   | Yes         | Database primary key for each nomination submission.                          |
| `student_name`      | `text`                     | Yes         | Name of the student submitting the nomination.                                |
| `student_id`        | `text`                     | Yes         | Student ID of the nominator. Stored as text to preserve leading zeros.        |
| `scholar_unique_id` | `text`                     | Recommended | This is scholars table row ID. This should match `scholars.id` when possible. |
| `scholar_name`      | `text`                     | Yes         | Name of the nominated scholar/staff member.                                   |
| `unit_code`         | `text`                     | Yes         | Unit code related to the nomination.                                          |
| `unit_name`         | `text`                     | Optional    | Full unit name, if available.                                                 |
| `teaching_period`   | `text`                     | Yes         | Teaching period of the nominated unit.                                        |
| `role_of_unit`      | `text`                     | Yes         | Role of the nominated person in this unit.                                    |
| `statement_support` | `text`                     | Yes         | Student's supporting statement. Must contain at least 25 words.               |
| `created_at`        | `timestamp with time zone` | Optional    | Time when the nomination was submitted.                                       |

### Notes

- This is the main table for student submissions.
- `scholar_unique_id` stores scholars table row ID..
- The frontend should insert new records into this table, but it should not publicly read all nominations.

---

## 3. Current Form Fields and Database Columns

| Form Field                                                    | Database Table | Database Column     |
| ------------------------------------------------------------- | -------------- | ------------------- |
| Student Name                                                  | `nominations`  | `student_name`      |
| Student ID                                                    | `nominations`  | `student_id`        |
| Who would you like to nominate for Teaching & Learning Award? | `nominations`  | `scholar_name`      |
| Scholar/Staff ID                                              | `nominations`  | `scholar_id`        |
| Unit Code                                                     | `nominations`  | `unit_code`         |
| Unit Name                                                     | `nominations`  | `unit_name`         |
| Teaching Period                                               | `nominations`  | `teaching_period`   |
| Role of this Unit                                             | `nominations`  | `role_of_unit`      |
| Statement of support                                          | `nominations`  | `statement_support` |

---

## 4. Frontend Database Usage

| Frontend Action                        | Table           | Operation |
| -------------------------------------- | --------------- | --------- |
| Check whether nominations are open     | `award_periods` | `SELECT`  |
| Search or display nominatable scholars | `scholars`      | `SELECT`  |
| Submit a nomination                    | `nominations`   | `INSERT`  |

### Notes for Frontend Developers

- The frontend must read `award_periods` to check whether nomination is open.
- The frontend must read `scholars` if autocomplete or staff selection is used.
- The frontend must insert into `nominations` when students submit the form.
- Do not expose private database keys in the frontend.

---

## 5. Keys and Relationships

## 5.1 Primary Keys

| Table           | Primary Key | Meaning                                |
| --------------- | ----------- | -------------------------------------- |
| `award_periods` | `id`        | Identifies each award period.          |
| `scholars`      | `id`        | Identifies each teaching record row.   |
| `nominations`   | `id`        | Identifies each nomination submission. |

---

## 5.2 Recommended Duplicate Rule

To avoid duplicate teaching records, the team should avoid creating two identical rows with the same:

```text
scholar_unique_id + unit + teaching_period + role_of_unit
```

This still allows the same scholar to appear in multiple rows when they teach different units, teaching periods, or roles.

---

## 5.3 Check Constraints

| Table           | Constraint                                                   | Purpose                                       |
| --------------- | ------------------------------------------------------------ | --------------------------------------------- |
| `award_periods` | Nomination open time must be before nomination close time.   | Prevents invalid nomination periods.          |
| `award_periods` | Application open time must be before application close time. | Prevents invalid application periods.         |
| `award_periods` | Application period should start after nomination period.     | Keeps the award process in the correct order. |
| `nominations`   | `statement_support` must contain at least 25 words.          | Ensures useful nomination statements.         |

---

## 6. Row Level Security and Permissions

RLS is enabled on all three tables.

| Table           | Public Frontend Permission | Reason                                        |
| --------------- | -------------------------- | --------------------------------------------- |
| `award_periods` | `SELECT` active rows only  | Needed to check whether nominations are open. |
| `scholars`      | `SELECT`                   | Needed for scholar search/autocomplete.       |
| `nominations`   | `INSERT`                   | Needed for students to submit nominations.    |

### Important RLS Notes

- `award_periods` can only be read publicly when `is_active = true`.
- `scholars` can be publicly read by the frontend.
- `nominations` can be inserted by the frontend, but should not be publicly readable.
- Because `scholars` is publicly readable, do not store sensitive personal information in this table.

---

## 7. Rules for Future Database Changes

Before changing the database, check:

- Which frontend page uses this table or column?
- Is this field required by the form?
- Does this change affect existing data?
- Does this change require changes to RLS policies?
- Does this change require changes to validation logic?

After changing the database, update this document with:

- What changed
- Why it changed
- Who changed it
- When it changed
- Whether the frontend or backend also needs to be updated

---

## 9. Change Log

Use this table to record future database changes.

| Date       | Changed By | Table      | Change                                   | Reason                                                                                      | Frontend/Backend Update Needed |
| ---------- | ---------- | ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------ |
| YYYY-MM-DD | Name       | Table name | Describe the change                      | Explain why it was needed                                                                   | Describe related code updates  |
| 2026-05-17 | Jerry      | scholars   | Removed created at and added email field | Need to store emails for notifications, date created field is not that useful for anything  | None                           |

##

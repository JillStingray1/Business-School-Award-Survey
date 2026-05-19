/**
 * test-backend.js — Backend logic tests (pure JavaScript, Node.js assert)
 *
 * Run with:  node test-backend.js
 *
 * Covers:
 *   - formatError           (handlers.ts)
 *   - toAwardPeriod         (handlers.ts)
 *   - validatePeriodPayload (handlers.ts)
 *   - buildTutorData        (parse_tutors.ts)
 *   - DatabaseManager       (db/index.ts)
 */

"use strict"
const assert = require("assert")

// ─── Terminal colours ─────────────────────────────────────────────────────────
const GREEN = "\x1b[32m", RED = "\x1b[31m", YELLOW = "\x1b[33m",
      RESET = "\x1b[0m",  BOLD = "\x1b[1m"

let passed = 0, failed = 0

async function describe(suiteName, fn) {
  console.log(`\n${BOLD}${YELLOW}▶ ${suiteName}${RESET}`)
  await fn()
}

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ${GREEN}✔${RESET} ${name}`)
    passed++
  } catch (err) {
    console.log(`  ${RED}✘${RESET} ${name}`)
    console.log(`    ${RED}${err.message}${RESET}`)
    failed++
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// INLINE: formatError  (mirrors handlers.ts)
// ═════════════════════════════════════════════════════════════════════════════
function formatError(err) {
  if (err instanceof Error) return err.message

  if (typeof err === "object" && err !== null) {
    const parts = [
      err.message,
      err.details,
      err.hint,
      err.code ? `Code: ${err.code}` : undefined,
    ].filter(Boolean)

    if (parts.length > 0) {
      if (err.code === "42501") {
        parts.push(
          "The current Supabase key does not have permission for this table. " +
          "Add SUPABASE_SERVICE_ROLE_KEY to the local .env for the admin app, " +
          "or create an explicit Supabase RLS policy for admin writes."
        )
      }
      return parts.join(" ")
    }
  }

  return String(err)
}

// ═════════════════════════════════════════════════════════════════════════════
// INLINE: toAwardPeriod  (mirrors handlers.ts)
// ═════════════════════════════════════════════════════════════════════════════
function toAwardPeriod(row) {
  return {
    id:                 row.id,
    name:               row.name,
    nominationOpenAt:   row.nomination_open_at,
    nominationCloseAt:  row.nomination_close_at,
    applicationOpenAt:  row.application_open_at,
    applicationCloseAt: row.application_close_at,
    isActive:           row.is_active,
    createdAt:          row.created_at,
    updatedAt:          row.updated_at,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// INLINE: validatePeriodPayload  (mirrors handlers.ts)
// ═════════════════════════════════════════════════════════════════════════════
function validatePeriodPayload(payload) {
  if (!payload.name.trim()) {
    throw new Error("Period name is required.")
  }

  const nominationOpenAt   = Date.parse(payload.nominationOpenAt)
  const nominationCloseAt  = Date.parse(payload.nominationCloseAt)
  const applicationOpenAt  = Date.parse(payload.applicationOpenAt)
  const applicationCloseAt = Date.parse(payload.applicationCloseAt)

  if (
    Number.isNaN(nominationOpenAt)   ||
    Number.isNaN(nominationCloseAt)  ||
    Number.isNaN(applicationOpenAt)  ||
    Number.isNaN(applicationCloseAt)
  ) {
    throw new Error("All period date-times must be valid.")
  }

  if (nominationOpenAt >= nominationCloseAt) {
    throw new Error("Nomination opening time must be before nomination closing time.")
  }

  if (applicationOpenAt >= applicationCloseAt) {
    throw new Error("Application opening time must be before application closing time.")
  }

  if (nominationCloseAt > applicationOpenAt) {
    throw new Error("Application opening time cannot be before nomination closing time.")
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// INLINE: buildTutorData  (mirrors post_tutors_to_db transform in parse_tutors.ts)
// ═════════════════════════════════════════════════════════════════════════════
function buildTutorData(tutors) {
  const tutor_data = []
  tutors.forEach((element) => {
    if (element["Full Name"] != null) {
      tutor_data.push({
        name:         element["Full Name"],
        unit_name:    element["Unit Name"],
        unit:         element["Unit"],
        role_of_unit: "Tutor",
        staff_id:     element["Staff Number"],
      })
    }
  })
  return tutor_data
}

// ═════════════════════════════════════════════════════════════════════════════
// INLINE: DatabaseManager  (mirrors db/index.ts)
// ═════════════════════════════════════════════════════════════════════════════
class DatabaseManager {
  query(sql, params = []) {
    void sql; void params
    throw new Error(
      "[DB] Raw SQL is not supported by the Supabase public client. " +
      "Use db.getClient().from(...), db.getClient().rpc(...), or expose a dedicated IPC handler."
    )
  }
  run(sql, params = []) {
    void sql; void params
    throw new Error(
      "[DB] Raw SQL writes are not supported by the Supabase public client. " +
      "Use db.getClient().from(...), db.getClient().rpc(...), or expose a dedicated IPC handler."
    )
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════════
;(async () => {

  // ── formatError ────────────────────────────────────────────────────────────
  await describe("formatError", async () => {
    await test("returns message from an Error instance", () => {
      assert.strictEqual(formatError(new Error("something broke")), "something broke")
    })
    await test("returns String(err) for a plain string", () => {
      assert.strictEqual(formatError("oops"), "oops")
    })
    await test("returns String(err) for a number", () => {
      assert.strictEqual(formatError(42), "42")
    })
    await test("formats a Supabase-style error object with message only", () => {
      assert.ok(formatError({ message: "not found" }).includes("not found"))
    })
    await test("formats a Supabase error with message + details + hint", () => {
      const result = formatError({ message: "err", details: "detail", hint: "hint" })
      assert.ok(result.includes("err") && result.includes("detail") && result.includes("hint"))
    })
    await test("includes code label when code is present", () => {
      assert.ok(formatError({ message: "err", code: "23505" }).includes("Code: 23505"))
    })
    await test("appends RLS guidance for code 42501", () => {
      assert.ok(formatError({ message: "permission denied", code: "42501" }).includes("SUPABASE_SERVICE_ROLE_KEY"))
    })
    await test("returns String(err) for an empty object (no known fields)", () => {
      assert.strictEqual(formatError({}), "[object Object]")
    })
    await test("returns String(err) for null", () => {
      assert.strictEqual(formatError(null), "null")
    })
  })

  // ── toAwardPeriod ──────────────────────────────────────────────────────────
  await describe("toAwardPeriod", async () => {
    const row = {
      id:                   "uuid-1",
      name:                 "Semester 1 2026",
      nomination_open_at:   "2026-03-01T00:00:00Z",
      nomination_close_at:  "2026-04-01T00:00:00Z",
      application_open_at:  "2026-04-01T00:00:00Z",
      application_close_at: "2026-05-01T00:00:00Z",
      is_active:            true,
      created_at:           "2026-01-01T00:00:00Z",
      updated_at:           "2026-02-01T00:00:00Z",
    }

    await test("maps id correctly", () =>
      assert.strictEqual(toAwardPeriod(row).id, "uuid-1"))
    await test("maps name correctly", () =>
      assert.strictEqual(toAwardPeriod(row).name, "Semester 1 2026"))
    await test("maps nomination_open_at → nominationOpenAt", () =>
      assert.strictEqual(toAwardPeriod(row).nominationOpenAt, "2026-03-01T00:00:00Z"))
    await test("maps nomination_close_at → nominationCloseAt", () =>
      assert.strictEqual(toAwardPeriod(row).nominationCloseAt, "2026-04-01T00:00:00Z"))
    await test("maps application_open_at → applicationOpenAt", () =>
      assert.strictEqual(toAwardPeriod(row).applicationOpenAt, "2026-04-01T00:00:00Z"))
    await test("maps application_close_at → applicationCloseAt", () =>
      assert.strictEqual(toAwardPeriod(row).applicationCloseAt, "2026-05-01T00:00:00Z"))
    await test("maps is_active → isActive", () =>
      assert.strictEqual(toAwardPeriod(row).isActive, true))
    await test("maps created_at → createdAt", () =>
      assert.strictEqual(toAwardPeriod(row).createdAt, "2026-01-01T00:00:00Z"))
    await test("maps updated_at → updatedAt", () =>
      assert.strictEqual(toAwardPeriod(row).updatedAt, "2026-02-01T00:00:00Z"))
    await test("createdAt is undefined when row has no created_at", () => {
      const { created_at, ...rowWithout } = row
      assert.strictEqual(toAwardPeriod(rowWithout).createdAt, undefined)
    })
  })

  // ── validatePeriodPayload ──────────────────────────────────────────────────
  await describe("validatePeriodPayload", async () => {
    function validPayload(overrides = {}) {
      return {
        name:               "Semester 1 2026",
        nominationOpenAt:   "2026-03-01T00:00:00Z",
        nominationCloseAt:  "2026-04-01T00:00:00Z",
        applicationOpenAt:  "2026-04-01T00:00:00Z",
        applicationCloseAt: "2026-05-01T00:00:00Z",
        isActive:           true,
        ...overrides,
      }
    }

    await test("does not throw for a valid payload", () => {
      assert.doesNotThrow(() => validatePeriodPayload(validPayload()))
    })
    await test("throws when name is empty string", () => {
      assert.throws(() => validatePeriodPayload(validPayload({ name: "" })), /Period name is required/)
    })
    await test("throws when name is whitespace only", () => {
      assert.throws(() => validatePeriodPayload(validPayload({ name: "   " })), /Period name is required/)
    })
    await test("throws when nominationOpenAt is invalid", () => {
      assert.throws(() => validatePeriodPayload(validPayload({ nominationOpenAt: "not-a-date" })), /All period date-times must be valid/)
    })
    await test("throws when nominationCloseAt is invalid", () => {
      assert.throws(() => validatePeriodPayload(validPayload({ nominationCloseAt: "not-a-date" })), /All period date-times must be valid/)
    })
    await test("throws when applicationOpenAt is invalid", () => {
      assert.throws(() => validatePeriodPayload(validPayload({ applicationOpenAt: "not-a-date" })), /All period date-times must be valid/)
    })
    await test("throws when applicationCloseAt is invalid", () => {
      assert.throws(() => validatePeriodPayload(validPayload({ applicationCloseAt: "not-a-date" })), /All period date-times must be valid/)
    })
    await test("throws when nomination open equals nomination close", () => {
      assert.throws(() => validatePeriodPayload(validPayload({
        nominationOpenAt: "2026-04-01T00:00:00Z", nominationCloseAt: "2026-04-01T00:00:00Z",
      })), /Nomination opening time must be before nomination closing time/)
    })
    await test("throws when nomination open is after nomination close", () => {
      assert.throws(() => validatePeriodPayload(validPayload({
        nominationOpenAt: "2026-05-01T00:00:00Z", nominationCloseAt: "2026-04-01T00:00:00Z",
      })), /Nomination opening time must be before nomination closing time/)
    })
    await test("throws when application open equals application close", () => {
      assert.throws(() => validatePeriodPayload(validPayload({
        applicationOpenAt: "2026-05-01T00:00:00Z", applicationCloseAt: "2026-05-01T00:00:00Z",
      })), /Application opening time must be before application closing time/)
    })
    await test("throws when application open is after application close", () => {
      assert.throws(() => validatePeriodPayload(validPayload({
        applicationOpenAt: "2026-06-01T00:00:00Z", applicationCloseAt: "2026-05-01T00:00:00Z",
      })), /Application opening time must be before application closing time/)
    })
    await test("throws when nomination close is after application open", () => {
      assert.throws(() => validatePeriodPayload(validPayload({
        nominationCloseAt: "2026-05-01T00:00:00Z", applicationOpenAt: "2026-04-01T00:00:00Z",
      })), /Application opening time cannot be before nomination closing time/)
    })
    await test("does not throw when nomination close equals application open (boundary OK)", () => {
      assert.doesNotThrow(() => validatePeriodPayload(validPayload({
        nominationCloseAt: "2026-04-01T00:00:00Z", applicationOpenAt: "2026-04-01T00:00:00Z",
      })))
    })
  })

  // ── buildTutorData ─────────────────────────────────────────────────────────
  await describe("buildTutorData (parse_tutors transformation)", async () => {
    const sample = [
      { "Staff Number": "S001", "Unit": "MKTG2200", "Unit Name": "Marketing Principles", "Full Name": "Alice Smith" },
      { "Staff Number": "S002", "Unit": "ACCT1101", "Unit Name": "Financial Accounting",  "Full Name": "Bob Jones"   },
    ]

    await test("returns one record per tutor with Full Name", () =>
      assert.strictEqual(buildTutorData(sample).length, 2))
    await test("maps Full Name → name", () =>
      assert.strictEqual(buildTutorData(sample)[0].name, "Alice Smith"))
    await test("maps Unit Name → unit_name", () =>
      assert.strictEqual(buildTutorData(sample)[0].unit_name, "Marketing Principles"))
    await test("maps Unit → unit", () =>
      assert.strictEqual(buildTutorData(sample)[0].unit, "MKTG2200"))
    await test("sets role_of_unit to 'Tutor' for all records", () =>
      assert.ok(buildTutorData(sample).every(r => r.role_of_unit === "Tutor")))
    await test("maps Staff Number → staff_id", () =>
      assert.strictEqual(buildTutorData(sample)[0].staff_id, "S001"))
    await test("skips rows where Full Name is null", () => {
      const tutors = [
        { "Staff Number": "S003", "Unit": "BUSN1000", "Unit Name": "Intro", "Full Name": null },
        { "Staff Number": "S004", "Unit": "BUSN1001", "Unit Name": "Adv",   "Full Name": "Carol Lee" },
      ]
      const result = buildTutorData(tutors)
      assert.strictEqual(result.length, 1)
      assert.strictEqual(result[0].name, "Carol Lee")
    })
    await test("skips rows where Full Name is undefined", () => {
      assert.strictEqual(buildTutorData([{ "Staff Number": "S005", "Unit": "BUSN1002", "Unit Name": "X" }]).length, 0)
    })
    await test("returns empty array for empty input", () => {
      assert.deepStrictEqual(buildTutorData([]), [])
    })
    await test("handles multiple tutors in the same unit", () => {
      const tutors = [
        { "Staff Number": "S010", "Unit": "MKTG2200", "Unit Name": "Marketing", "Full Name": "Dave" },
        { "Staff Number": "S011", "Unit": "MKTG2200", "Unit Name": "Marketing", "Full Name": "Eve"  },
      ]
      assert.strictEqual(buildTutorData(tutors).length, 2)
    })
  })

  // ── DatabaseManager ────────────────────────────────────────────────────────
  await describe("DatabaseManager — raw SQL guard", async () => {
    const db = new DatabaseManager()

    await test("db.query() always throws with Supabase guidance", () => {
      assert.throws(() => db.query("SELECT 1"), /Raw SQL is not supported/)
    })
    await test("db.run() always throws with Supabase guidance", () => {
      assert.throws(() => db.run("INSERT INTO foo VALUES (1)"), /Raw SQL writes are not supported/)
    })
    await test("db.query() error message mentions getClient", () => {
      assert.throws(() => db.query("SELECT 1"), /getClient/)
    })
    await test("db.run() error message mentions getClient", () => {
      assert.throws(() => db.run("DELETE FROM foo"), /getClient/)
    })
  })

  // ── Summary ────────────────────────────────────────────────────────────────
  const total = passed + failed
  console.log(`\n${"─".repeat(50)}`)
  console.log(`${BOLD}Results: ${passed}/${total} passed${RESET}`)
  if (failed > 0) {
    console.log(`${RED}${BOLD}${failed} test(s) failed.${RESET}`)
    process.exit(1)
  } else {
    console.log(`${GREEN}${BOLD}All tests passed! ✓${RESET}`)
  }
})()

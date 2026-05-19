/**
 * test.js — Pure JavaScript tests using Node.js built-in assert
 * No external dependencies required.
 *
 * Run with:  node test.js
 *
 * Covers:
 *   - AppUtils  (utils.js)   — getWordCount, formatDateTime, makeScholarOption
 *   - AppConfig (config.js)  — structure, headers, table/field names
 *   - ApiClient (api.js)     — URL construction, response handling, error handling
 *                              (fetch is mocked — no real network calls)
 */

"use strict"
const assert = require("assert")

// ─── Terminal colours ─────────────────────────────────────────────────────────
const GREEN = "\x1b[32m", RED = "\x1b[31m", YELLOW = "\x1b[33m",
      RESET = "\x1b[0m",  BOLD = "\x1b[1m"

// ─── Async-safe test runner ───────────────────────────────────────────────────
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

// ─── Inline AppUtils (mirrors js/utils.js) ────────────────────────────────────
const AppUtils = (() => {
  function getWordCount(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length
  }

  function formatDateTime(value) {
    if (!value) return "Not set"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleString([], {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  }

  function makeScholarOption(scholar, primaryKey = "id") {
    const details = [scholar.unit, scholar.unit_name, scholar.teaching_period, scholar.role_of_unit]
      .filter(Boolean).join(" · ")
    return {
      label: details ? `${scholar.name} — ${details}` : scholar.name,
      value: scholar[primaryKey],
      scholar
    }
  }

  return { getWordCount, formatDateTime, makeScholarOption }
})()

// ─── Inline AppConfig (mirrors js/config.js) ──────────────────────────────────
const AppConfig = (() => {
  const supabaseUrl = "https://maoihtefcdmnlnbxntpo.supabase.co"
  const supabaseKey = "sb_publishable_cV-NScvnaMiX-6KRkTXu0g_DFMrhQF6"
  const config = {
    supabaseUrl,
    supabaseKey,
    tables:   Object.freeze({ awardPeriods: "award_periods", scholars: "scholars", nominations: "nominations" }),
    dbFields: Object.freeze({ scholarPrimaryKey: "id", nominationScholarField: "scholar_id" })
  }
  config.headers = Object.freeze({
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json"
  })
  return Object.freeze(config)
})()

// ─── Inline ApiClient with injectable fetch (mirrors js/api.js) ───────────────
function makeApiClient(fetchFn) {
  const { supabaseUrl, headers, tables, dbFields } = AppConfig
  const scholarColumns = [
    dbFields.scholarPrimaryKey, "name", "unit", "unit_name", "teaching_period", "role_of_unit"
  ].join(",")

  function endpoint(tableName, params) {
    return `${supabaseUrl}/rest/v1/${tableName}${params ? "?" + params.toString() : ""}`
  }

  async function fetchJson(url, options = {}, errorMessage = "Request failed") {
    const res = await fetchFn(url, { headers, ...options })
    if (!res.ok) throw new Error(`${errorMessage}: ${await res.text() || res.status}`)
    if (res.status === 204) return null
    return res.json()
  }

  async function getOpenAwardPeriod(nowIso) {
    const params = new URLSearchParams({
      is_active: "eq.true", nomination_open_at: `lte.${nowIso}`,
      nomination_close_at: `gt.${nowIso}`,
      select: "id,name,nomination_open_at,nomination_close_at",
      order: "nomination_close_at.asc", limit: "1"
    })
    const data = await fetchJson(endpoint(tables.awardPeriods, params), {}, "Failed to fetch open award period")
    return Array.isArray(data) ? data[0] : data
  }

  async function getActiveAwardPeriods() {
    const params = new URLSearchParams({
      is_active: "eq.true",
      select: "id,name,nomination_open_at,nomination_close_at",
      order: "nomination_open_at.asc"
    })
    const data = await fetchJson(endpoint(tables.awardPeriods, params), {}, "Failed to fetch active award periods")
    return Array.isArray(data) ? data : []
  }

  async function searchScholarsByName(query) {
    const params = new URLSearchParams({ name: `ilike.*${query}*`, select: scholarColumns, limit: "6" })
    const data = await fetchJson(endpoint(tables.scholars, params), {}, "Failed to fetch scholars")
    return data || []
  }

  async function searchScholarsByUnit(query) {
    const params = new URLSearchParams({
      unit: `ilike.*${query}*`, select: scholarColumns, order: "name.asc", limit: "20"
    })
    const data = await fetchJson(endpoint(tables.scholars, params), {}, "Failed to search by unit code")
    return data || []
  }

  async function submitNomination(payload) {
    const res = await fetchFn(endpoint(tables.nominations), {
      method: "POST",
      headers: { ...headers, "Prefer": "return=minimal" },
      body: JSON.stringify(payload)
    })
    if (!res.ok && res.status !== 201)
      throw new Error(`Submission failed: ${await res.text() || res.status}`)
  }

  return { getOpenAwardPeriod, getActiveAwardPeriods, searchScholarsByName, searchScholarsByUnit, submitNomination }
}

// ─── Mock fetch factory ───────────────────────────────────────────────────────
// Returns a per-instance fetch spy so tests don't share state.
function mockFetch(body, status = 200) {
  const fn = async (url, options) => {
    fn._lastUrl     = url
    fn._lastOptions = options
    return {
      ok:   status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body)
    }
  }
  return fn
}

// ═════════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════════
;(async () => {

  // ── AppUtils: getWordCount ─────────────────────────────────────────────────
  await describe("AppUtils.getWordCount", async () => {
    await test("returns 0 for empty string",           () => assert.strictEqual(AppUtils.getWordCount(""), 0))
    await test("returns 0 for null",                   () => assert.strictEqual(AppUtils.getWordCount(null), 0))
    await test("returns 0 for undefined",              () => assert.strictEqual(AppUtils.getWordCount(undefined), 0))
    await test("returns 0 for whitespace-only string", () => assert.strictEqual(AppUtils.getWordCount("   "), 0))
    await test("counts a single word",                 () => assert.strictEqual(AppUtils.getWordCount("hello"), 1))
    await test("counts multiple words",                () => assert.strictEqual(AppUtils.getWordCount("hello world foo"), 3))
    await test("handles extra spaces between words",   () => assert.strictEqual(AppUtils.getWordCount("one   two   three"), 3))
    await test("handles newlines as word separators",  () => assert.strictEqual(AppUtils.getWordCount("line one\nline two"), 4))
    await test("counts exactly 25 words (statement minimum)", () =>
      assert.strictEqual(AppUtils.getWordCount(Array(25).fill("word").join(" ")), 25))
    await test("counts 24 words — below the 25-word minimum", () =>
      assert.strictEqual(AppUtils.getWordCount(Array(24).fill("word").join(" ")), 24))
  })

  // ── AppUtils: formatDateTime ───────────────────────────────────────────────
  await describe("AppUtils.formatDateTime", async () => {
    await test('returns "Not set" for null',               () => assert.strictEqual(AppUtils.formatDateTime(null), "Not set"))
    await test('returns "Not set" for undefined',          () => assert.strictEqual(AppUtils.formatDateTime(undefined), "Not set"))
    await test('returns "Not set" for empty string',       () => assert.strictEqual(AppUtils.formatDateTime(""), "Not set"))
    await test("returns original string for invalid date", () => assert.strictEqual(AppUtils.formatDateTime("not-a-date"), "not-a-date"))
    await test("returns a non-empty string for valid ISO date", () => {
      const r = AppUtils.formatDateTime("2026-06-01T10:00:00.000Z")
      assert.ok(r.length > 0 && r !== "Not set", `Unexpected: "${r}"`)
    })
    await test("includes the year for a valid ISO date", () => {
      const r = AppUtils.formatDateTime("2026-06-01T10:00:00.000Z")
      assert.ok(r.includes("2026"), `Expected "2026" in "${r}"`)
    })
  })

  // ── AppUtils: makeScholarOption ────────────────────────────────────────────
  await describe("AppUtils.makeScholarOption", async () => {
    const full = {
      id: 42, name: "Dr. Jane Smith", unit: "MKTG2200",
      unit_name: "Marketing Principles", teaching_period: "Semester 1, 2026",
      role_of_unit: "Unit Coordinator"
    }
    await test("value equals scholar.id by default", () =>
      assert.strictEqual(AppUtils.makeScholarOption(full).value, 42))
    await test("uses a custom primaryKey when supplied", () => {
      const s = { scholar_unique_id: "abc-123", name: "Prof. Lee" }
      assert.strictEqual(AppUtils.makeScholarOption(s, "scholar_unique_id").value, "abc-123")
    })
    await test("attaches the original scholar object", () =>
      assert.strictEqual(AppUtils.makeScholarOption(full).scholar, full))
    await test("label includes name and all detail fields", () => {
      const { label } = AppUtils.makeScholarOption(full)
      for (const s of ["Dr. Jane Smith", "MKTG2200", "Marketing Principles", "Semester 1, 2026", "Unit Coordinator"])
        assert.ok(label.includes(s), `Missing "${s}" in label`)
    })
    await test("label is just the name when no detail fields present", () =>
      assert.strictEqual(AppUtils.makeScholarOption({ id: 1, name: "Prof. Solo" }).label, "Prof. Solo"))
    await test("label omits missing optional fields gracefully", () => {
      const { label } = AppUtils.makeScholarOption({ id: 2, name: "Dr. Part", unit: "ACCT1101" })
      assert.ok(label.includes("Dr. Part") && label.includes("ACCT1101") && !label.endsWith(" · "))
    })
    await test("detail fields are joined with ' · '", () =>
      assert.ok(AppUtils.makeScholarOption(full).label.includes(" · ")))
  })

  // ── AppConfig: structure ───────────────────────────────────────────────────
  await describe("AppConfig structure", async () => {
    await test("supabaseUrl is a valid https URL", () =>
      assert.ok(AppConfig.supabaseUrl.startsWith("https://")))
    await test("supabaseKey is a non-empty string", () =>
      assert.ok(typeof AppConfig.supabaseKey === "string" && AppConfig.supabaseKey.length > 0))
    await test("tables contains awardPeriods, scholars, nominations", () => {
      for (const k of ["awardPeriods", "scholars", "nominations"])
        assert.ok(k in AppConfig.tables, `Missing table key: ${k}`)
    })
    await test("dbFields contains scholarPrimaryKey and nominationScholarField", () => {
      for (const k of ["scholarPrimaryKey", "nominationScholarField"])
        assert.ok(k in AppConfig.dbFields, `Missing dbField key: ${k}`)
    })
    await test("headers contain apikey, Authorization, Content-Type", () => {
      for (const k of ["apikey", "Authorization", "Content-Type"])
        assert.ok(k in AppConfig.headers, `Missing header: ${k}`)
    })
    await test("Authorization header uses Bearer scheme", () =>
      assert.ok(AppConfig.headers["Authorization"].startsWith("Bearer ")))
    await test("Content-Type is application/json", () =>
      assert.strictEqual(AppConfig.headers["Content-Type"], "application/json"))
  })

  // ── ApiClient: URL construction ────────────────────────────────────────────
  await describe("ApiClient — URL construction", async () => {
    await test("getOpenAwardPeriod calls the award_periods endpoint", async () => {
      const f = mockFetch([])
      await makeApiClient(f).getOpenAwardPeriod("2026-05-16T00:00:00.000Z")
      assert.ok(f._lastUrl.includes("/rest/v1/award_periods"), `URL was: ${f._lastUrl}`)
    })
    await test("getOpenAwardPeriod URL includes is_active=eq.true", async () => {
      const f = mockFetch([])
      await makeApiClient(f).getOpenAwardPeriod("2026-05-16T00:00:00.000Z")
      assert.ok(f._lastUrl.includes("is_active=eq.true"), `URL was: ${f._lastUrl}`)
    })
    await test("searchScholarsByName calls the scholars endpoint", async () => {
      const f = mockFetch([])
      await makeApiClient(f).searchScholarsByName("Smith")
      assert.ok(f._lastUrl.includes("/rest/v1/scholars"), `URL was: ${f._lastUrl}`)
    })
    await test("searchScholarsByName URL includes the search query", async () => {
      const f = mockFetch([])
      await makeApiClient(f).searchScholarsByName("Smith")
      assert.ok(f._lastUrl.includes("Smith"), `URL was: ${f._lastUrl}`)
    })
    await test("searchScholarsByUnit calls the scholars endpoint", async () => {
      const f = mockFetch([])
      await makeApiClient(f).searchScholarsByUnit("MKTG")
      assert.ok(f._lastUrl.includes("/rest/v1/scholars"), `URL was: ${f._lastUrl}`)
    })
    await test("searchScholarsByUnit URL includes the unit query", async () => {
      const f = mockFetch([])
      await makeApiClient(f).searchScholarsByUnit("MKTG")
      assert.ok(f._lastUrl.includes("MKTG"), `URL was: ${f._lastUrl}`)
    })
    await test("submitNomination uses POST method", async () => {
      const f = mockFetch(null, 201)
      await makeApiClient(f).submitNomination({ scholar_id: 1 })
      assert.strictEqual(f._lastOptions.method, "POST")
    })
    await test("submitNomination calls the nominations endpoint", async () => {
      const f = mockFetch(null, 201)
      await makeApiClient(f).submitNomination({ scholar_id: 1 })
      assert.ok(f._lastUrl.includes("/rest/v1/nominations"), `URL was: ${f._lastUrl}`)
    })
    await test("submitNomination sets Prefer: return=minimal header", async () => {
      const f = mockFetch(null, 201)
      await makeApiClient(f).submitNomination({ scholar_id: 1 })
      assert.strictEqual(f._lastOptions.headers["Prefer"], "return=minimal")
    })
  })

  // ── ApiClient: response handling ───────────────────────────────────────────
  await describe("ApiClient — response handling", async () => {
    await test("getOpenAwardPeriod returns first element of array response", async () => {
      const period = { id: 1, name: "Sem 1 2026" }
      const result = await makeApiClient(mockFetch([period])).getOpenAwardPeriod("2026-05-16T00:00:00.000Z")
      assert.deepStrictEqual(result, period)
    })
    await test("getOpenAwardPeriod returns undefined when array is empty", async () => {
      const result = await makeApiClient(mockFetch([])).getOpenAwardPeriod("2026-05-16T00:00:00.000Z")
      assert.strictEqual(result, undefined)
    })
    await test("getActiveAwardPeriods returns the full array", async () => {
      const periods = [{ id: 1 }, { id: 2 }]
      assert.deepStrictEqual(await makeApiClient(mockFetch(periods)).getActiveAwardPeriods(), periods)
    })
    await test("getActiveAwardPeriods returns [] when response is not an array", async () => {
      assert.deepStrictEqual(await makeApiClient(mockFetch(null)).getActiveAwardPeriods(), [])
    })
    await test("searchScholarsByName returns the data array", async () => {
      const scholars = [{ id: 1, name: "Dr. Smith" }]
      assert.deepStrictEqual(await makeApiClient(mockFetch(scholars)).searchScholarsByName("Smith"), scholars)
    })
    await test("searchScholarsByName returns [] when response is null", async () => {
      assert.deepStrictEqual(await makeApiClient(mockFetch(null)).searchScholarsByName("Smith"), [])
    })
    await test("searchScholarsByUnit returns the data array", async () => {
      const scholars = [{ id: 2, name: "Prof. Lee", unit: "MKTG2200" }]
      assert.deepStrictEqual(await makeApiClient(mockFetch(scholars)).searchScholarsByUnit("MKTG"), scholars)
    })
    await test("searchScholarsByUnit returns [] when response is null", async () => {
      assert.deepStrictEqual(await makeApiClient(mockFetch(null)).searchScholarsByUnit("MKTG"), [])
    })
  })

  // ── ApiClient: error handling ──────────────────────────────────────────────
  await describe("ApiClient — error handling", async () => {
    await test("searchScholarsByName throws on 401 Unauthorized", async () => {
      await assert.rejects(
        () => makeApiClient(mockFetch({ message: "Unauthorized" }, 401)).searchScholarsByName("Smith"),
        /Failed to fetch scholars/
      )
    })
    await test("getOpenAwardPeriod throws on 500 Server Error", async () => {
      await assert.rejects(
        () => makeApiClient(mockFetch({ message: "Error" }, 500)).getOpenAwardPeriod("2026-05-16T00:00:00.000Z"),
        /Failed to fetch open award period/
      )
    })
    await test("getActiveAwardPeriods throws on 403 Forbidden", async () => {
      await assert.rejects(
        () => makeApiClient(mockFetch({ message: "Forbidden" }, 403)).getActiveAwardPeriods(),
        /Failed to fetch active award periods/
      )
    })
    await test("submitNomination throws on 400 Bad Request", async () => {
      await assert.rejects(
        () => makeApiClient(mockFetch({ message: "Bad Request" }, 400)).submitNomination({ scholar_id: 99 }),
        /Submission failed/
      )
    })
    await test("submitNomination does NOT throw on 201 Created", async () => {
      await assert.doesNotReject(() => makeApiClient(mockFetch(null, 201)).submitNomination({ scholar_id: 1 }))
    })
    await test("submitNomination does NOT throw on 200 OK", async () => {
      await assert.doesNotReject(() => makeApiClient(mockFetch(null, 200)).submitNomination({ scholar_id: 1 }))
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

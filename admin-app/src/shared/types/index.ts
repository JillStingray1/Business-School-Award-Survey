/** Shared TypeScript types and IPC channel definitions used by both
 *  the main process (Node.js) and the renderer process (Vue).
 */

// ---------------------------------------------------------------------------
// IPC channel names
// ---------------------------------------------------------------------------
export const IPC_CHANNELS = {
  // File operations
  FILE_PARSE_CSV: 'file:parse-csv',

  // Database operations
  DB_QUERY: 'db:query',
  DB_RUN: 'db:run',
  PERIOD_LIST: 'period:list',
  PERIOD_SAVE: 'period:save',
  PERIOD_CLOSE: 'period:close',
  STUDENT_RESPONSES_LIST: 'student-responses:list',

  // API proxy
  API_REQUEST: 'api:request',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------
export interface CsvRow {
  [key: string]: string;
}

export interface ApiRequestPayload {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: unknown;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

export interface DbQueryPayload {
  sql: string;
  params?: unknown[];
}

export type PeriodStatus = 'Upcoming' | 'Nominations Open' | 'Applications Open' | 'Closed';

export interface AwardPeriod {
  id: string;
  name: string;
  nominationOpenAt: string;
  nominationCloseAt: string;
  applicationOpenAt: string;
  applicationCloseAt: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AwardPeriodSavePayload {
  id?: string;
  name: string;
  nominationOpenAt: string;
  nominationCloseAt: string;
  applicationOpenAt: string;
  applicationCloseAt: string;
  isActive: boolean;
}

export interface StudentResponse {
  id: number;
  studentName: string;
  studentId: string;
  scholarName: string;
  unitCode: string;
  unitName: string | null;
  teachingPeriod: string;
  roleOfUnit: string;
  statementSupport: string;
  createdAt?: string;
}

export interface IpcResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Interface for ScholarData, which represents
 * the JSON format to upload to the `scholars`
 * table in the database
 */
export interface ScholarData {
  "name": string,
  "unit"?: string,
  "unit_name"?: string,
  "role_of_unit"?: string,
  "staff_id"?: string,
  "semester"?: string,
}
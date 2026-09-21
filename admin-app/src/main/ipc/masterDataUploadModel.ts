import * as XLSX from 'xlsx';
import type {
  MasterDataUploadDraft,
  MasterDataUploadError,
  ScholarData,
} from '../../shared/types';

const TUTOR_SHEET_NAMES = ['Casual Tutors', 'Casual Tutor'] as const;
const TUTOR_HEADERS = ['Staff Number', 'Unit', 'Unit Name', 'Full Name'] as const;
const COORDINATOR_HEADERS = [
  'CurriculumType',
  'Code',
  'Title',
  'Status',
  'Coordinator',
] as const;

interface TutorSourceRow {
  'Staff Number': unknown;
  Unit: unknown;
  'Unit Name': unknown;
  'Full Name': unknown;
  [key: string]: unknown;
}

interface CoordinatorSourceRow {
  CurriculumType: unknown;
  Code: unknown;
  Title: unknown;
  Status: unknown;
  Coordinator: unknown;
  [key: string]: unknown;
}

export interface ParsedMasterDataWorkbook {
  attemptedCount: number;
  rejectedCount: number;
  records: ScholarData[];
  errors: MasterDataUploadError[];
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/^\uFEFF/, '').trim();
}

function parseTutorRows(
  rows: TutorSourceRow[],
  sourceName: string,
): ParsedMasterDataWorkbook {
  const records: ScholarData[] = [];
  const errors: MasterDataUploadError[] = [];
  let rejectedCount = 0;

  rows.forEach((row, index) => {
    const requiredFields = {
      'Staff Number': cellText(row['Staff Number']),
      Unit: cellText(row.Unit),
      'Unit Name': cellText(row['Unit Name']),
      'Full Name': cellText(row['Full Name']),
    };
    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value)
      .map(([field]) => field);

    if (missingFields.length > 0) {
      rejectedCount += 1;
      errors.push({
        sheet: sourceName,
        row: index + 2,
        message: `Missing required fields: ${missingFields.join(', ')}.`,
      });
      return;
    }

    records.push({
      name: requiredFields['Full Name'],
      unit: requiredFields.Unit,
      unit_name: requiredFields['Unit Name'],
      role_of_unit: 'Tutor',
      staff_id: requiredFields['Staff Number'],
    });
  });

  return {
    attemptedCount: rows.length,
    rejectedCount,
    records,
    errors,
  };
}

function parseCoordinatorRows(
  rows: CoordinatorSourceRow[],
  sourceName: string,
): ParsedMasterDataWorkbook {
  const records: ScholarData[] = [];
  const errors: MasterDataUploadError[] = [];
  let rejectedCount = 0;

  rows.forEach((row, index) => {
    const code = cellText(row.Code);
    const title = cellText(row.Title);
    const coordinator = cellText(row.Coordinator);
    const missingFields = [
      !code ? 'Code' : '',
      !title ? 'Title' : '',
      !coordinator ? 'Coordinator' : '',
    ].filter(Boolean);

    if (missingFields.length > 0) {
      rejectedCount += 1;
      errors.push({
        sheet: sourceName,
        row: index + 2,
        message: `Missing required fields: ${missingFields.join(', ')}.`,
      });
      return;
    }

    const coordinatorMatch = coordinator.match(/^(.+?)\s*[{(]\s*([^{}()]+)\s*[})]\s*$/);
    records.push({
      name: coordinatorMatch?.[1].trim() || coordinator,
      unit: code,
      unit_name: title,
      role_of_unit: 'Unit Coordinator',
      staff_id: coordinatorMatch?.[2].trim() || undefined,
    });
  });

  return {
    attemptedCount: rows.length,
    rejectedCount,
    records,
    errors,
  };
}

function parseCsvWorkbook(workbook: XLSX.WorkBook): ParsedMasterDataWorkbook {
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;

  if (!sheet) {
    return {
      attemptedCount: 0,
      rejectedCount: 0,
      records: [],
      errors: [{ sheet: 'CSV', message: 'The CSV file is empty.' }],
    };
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  const headers = (matrix[0] ?? []).map(cellText);
  const hasHeaders = (required: readonly string[]) => required.every(header => headers.includes(header));

  if (hasHeaders(TUTOR_HEADERS)) {
    const rows = XLSX.utils.sheet_to_json<TutorSourceRow>(sheet, { defval: '', raw: false });
    return parseTutorRows(rows, 'CSV');
  }

  if (hasHeaders(COORDINATOR_HEADERS)) {
    const rows = XLSX.utils.sheet_to_json<CoordinatorSourceRow>(sheet, { defval: '', raw: false });
    return parseCoordinatorRows(rows, 'CSV');
  }

  return {
    attemptedCount: 0,
    rejectedCount: 0,
    records: [],
    errors: [{
      sheet: 'CSV',
      message: 'The file does not contain supported CSV columns for Casual Tutors or Unit Coordinators.',
    }],
  };
}

export function parseMasterDataWorkbook(
  bytes: ArrayBuffer,
  fileName = 'master-data.xlsx',
): ParsedMasterDataWorkbook {
  const workbook = XLSX.read(bytes, { type: 'array' });

  if (fileName.toLowerCase().endsWith('.csv')) {
    return parseCsvWorkbook(workbook);
  }

  const sheetName = TUTOR_SHEET_NAMES.find(name => workbook.SheetNames.includes(name));

  if (!sheetName) {
    return {
      attemptedCount: 0,
      rejectedCount: 0,
      records: [],
      errors: [{
        sheet: 'Workbook',
        message: 'Required sheet "Casual Tutors" or "Casual Tutor" was not found.',
      }],
    };
  }

  const rows = XLSX.utils.sheet_to_json<TutorSourceRow>(workbook.Sheets[sheetName], {
    defval: '',
    raw: false,
  });
  return parseTutorRows(rows, sheetName);
}

export function buildMasterDataUploadDraft(
  fileName: string,
  parsed: ParsedMasterDataWorkbook,
  successfulCount: number,
  uploadError?: string,
): MasterDataUploadDraft {
  const boundedSuccessfulCount = Math.max(
    0,
    Math.min(successfulCount, parsed.attemptedCount),
  );
  const errors = [...parsed.errors];

  if (uploadError) {
    errors.push({ sheet: 'Database', message: uploadError });
  }

  const failedCount = Math.max(0, parsed.attemptedCount - boundedSuccessfulCount);
  const status = boundedSuccessfulCount === parsed.attemptedCount && errors.length === 0
    ? 'Success'
    : boundedSuccessfulCount > 0
      ? 'Partial'
      : 'Failed';

  return {
    fileName,
    attemptedCount: parsed.attemptedCount,
    successfulCount: boundedSuccessfulCount,
    failedCount,
    status,
    errors,
  };
}

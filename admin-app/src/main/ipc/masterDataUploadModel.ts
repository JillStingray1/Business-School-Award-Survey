import * as XLSX from 'xlsx';
import type {
  MasterDataUploadDraft,
  MasterDataUploadError,
  ScholarData,
} from '../../shared/types';

const TUTOR_SHEET_NAMES = ['Casual Tutors', 'Casual Tutor'] as const;

interface TutorSourceRow {
  'Staff Number': unknown;
  Unit: unknown;
  'Unit Name': unknown;
  'Full Name': unknown;
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

  return String(value).trim();
}

export function parseMasterDataWorkbook(bytes: ArrayBuffer): ParsedMasterDataWorkbook {
  const workbook = XLSX.read(bytes, { type: 'array' });
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
        sheet: sheetName,
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

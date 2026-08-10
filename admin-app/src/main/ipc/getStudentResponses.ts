import { app } from 'electron';
import { writeFileSync } from 'fs';
import { join } from 'path';
import {
    IpcResult,
    StudentResponse,
} from '../../shared/types';
import { getSupabaseClient } from '../db';
import { formatError } from './handlers'

interface NominationRow {
    id: number;
    student_name: string;
    student_id: string;
    scholar_name: string;
    unit_code: string;
    unit_name: string | null;
    teaching_period: string;
    role_of_unit: string;
    statement_support: string;
    created_at?: string;
}

/**
 * 
 * @param row Converts a nomination row from the DB to a student response object ready for
 * viewing
 * @returns StudentResponse
 */
function toStudentResponse(row: NominationRow): StudentResponse {
    return {
        id: row.id,
        studentName: row.student_name,
        studentId: row.student_id,
        scholarName: row.scholar_name,
        unitCode: row.unit_code,
        unitName: row.unit_name,
        teachingPeriod: row.teaching_period,
        roleOfUnit: row.role_of_unit,
        statementSupport: row.statement_support,
        createdAt: row.created_at,
    };
}

/**
 * Gets a list of student responses
 */
export async function getStudentResponsesList(): Promise<IpcResult<StudentResponse[]>> {
    try {
        const { data, error } = await getSupabaseClient()
            .from('nominations')
            .select(
                'id,student_name,student_id,scholar_name,unit_code,unit_name,teaching_period,role_of_unit,statement_support,created_at',
            )
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return { success: true, data: (data ?? []).map(row => toStudentResponse(row as NominationRow)) };
    } catch (err) {
        return { success: false, error: formatError(err) };
    }
}


/**
 * Fetches all student responses and writes them to a CSV file.
 *
 * Uses Electron's app.getPath('documents') so the output location is
 * stable and predictable regardless of how the packaged app was launched
 * (double-click, dock, terminal, etc.) — unlike process.cwd(), which
 * depends on the launching process's working directory.
 */
export async function exportStudentResponsesToCsv(): Promise<IpcResult<string>> {
    try {
        const result = await getStudentResponsesList();

        if (!result.success || !result.data) {
            return { success: false, error: result.error ?? 'No student response data returned.' };
        }
        const rows = result.data;
        const headers = [
            'id',
            'studentName',
            'studentId',
            'scholarName',
            'unitCode',
            'unitName',
            'teachingPeriod',
            'roleOfUnit',
            'statementSupport',
            'createdAt',
        ];
        const escapeCsvValue = (value: unknown): string => {
            if (value === null || value === undefined) {
                return '';
            }
            const str = String(value);
            if (/[",\n]/.test(str)) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        const csvLines = [
            headers.join(','),
            ...rows.map(row =>
                [
                    row.id,
                    row.studentName,
                    row.studentId,
                    row.scholarName,
                    row.unitCode,
                    row.unitName,
                    row.teachingPeriod,
                    row.roleOfUnit,
                    row.statementSupport,
                    row.createdAt,
                ]
                    .map(escapeCsvValue)
                    .join(','),
            ),
        ];
        const csvContent = csvLines.join('\n');
        const outputPath = join(app.getPath('documents'), 'student_responses.csv');
        writeFileSync(outputPath, csvContent, 'utf-8');
        return { success: true, data: outputPath };
    } catch (err) {
        return { success: false, error: formatError(err) };
    }
}

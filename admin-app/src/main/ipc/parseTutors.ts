import { IpcMainEvent } from 'electron';
import * as  xlsx from 'xlsx'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

import { ScholarData } from '@shared/types';
import { supabase } from '../db';

/**
 * This function handles the parsing and upload of tutor data in the database
 * 
 * 
 * @param event 
 * @param excel_file The excel file containing a lists of tutors and lecturers
 *      
 */
export function handleTutorList(event: IpcMainEvent, excel_file: Blob): void {
  let data_contents = parse_tutor_list(excel_file);
  post_tutors_to_db(supabase, data_contents["Casual Tutor"])
}

/**
 * Pases the tutor list into 
 * 
 * This file takes in an Excel spreadsheet with the formatting below
 * Table has 2 sheets, one for lecturers, and another for
 * tutors.
 * 
 * Lecturers have:
 * 
 * **| CurriculumType | Code | Title | Status | Coordinator |**
 * 
 * as table headers
 * 
 * Casual tutors have: 
 * 
 * **| Staff Number | Unit | Unit Name | First Name | Last Name | Full Name | Department | Email |**
 * 
 * as table headers
 * 
 * this is from example given by Client
 * 
 * @param excel_file 
 * @returns JSON object with each row contain the column header being an attribute and cell value being that attribute's value 
 */
function parse_tutor_list(excel_file: Blob): any {
  const contents = xlsx.read(excel_file);
  let data: any = {}
  const sheets = contents.SheetNames
  for (let i = 0; i < sheets.length; i++) {
    data[contents.SheetNames[i]] = []
    const temp = xlsx.utils.sheet_to_json(
      contents.Sheets[contents.SheetNames[i]]
    );
    temp.forEach((res) => {
      data[contents.SheetNames[i]].push(res)
    })
  }
  return data
}

/**
 * Reformats tutors into format matching the databases' table headers and
 * inserts the data into the database
 * 
 * 
 * @param supabase supabase connection
 * @param tutors list of tutors extracted from excel
 */
async function post_tutors_to_db(supabase: SupabaseClient, tutors: any): Promise<void> {
  let tutor_data: ScholarData[] = []
  tutors.forEach((element: any) => {
    if (element["Full Name"] != null) {
      tutor_data.push({
        "name": element["Full Name"],
        "unit_name": element["Unit Name"],
        "unit": element["Unit"],
        "role_of_unit": "Tutor",
        "staff_id": element["Staff Number"]
      })
    }
  });
  const { data, error } = await supabase.from("scholars").insert(tutor_data).select()
}


/**
 * Reformats lecturers into format matching the databases' table headers and
 * inserts the data into the database
 *
 * Not functional right now due to issues with the formatting of lecturer data in the excel spreadsheet
 *
 * @param supabase supabase connection
 * @param lecturers list of tutors extracted from excel
 */
async function post_lecturers_to_db(supabase: SupabaseClient, lecturers: any): Promise<void> {
  let lecturer_data: ScholarData[] = []
  lecturers.forEach((element: any) => {
    if (element["Coordinator"] != null) {
      let coordinators = element["Coordinator"].split("^(and)|&$")
      console.log(coordinators)
      coordinators.forEach((coordinator: string) => {
        let temp = coordinator.trim().split("{")
        console.log(temp)
        lecturer_data.push({
          "name": temp[0].trim(),
          "unit_name": element["Unit Name"],
          "unit": element["Unit"],
          "role_of_unit": "Lecturer",
          "staff_id": temp[1].trim().replace("}", ""),
        })
      })


    }
  });
  console.log(lecturer_data)
  // const { data, error } = await supabase.from("scholars").insert(lecturer_data).select()
}

export interface TutorPreviewResult {
  tutors: ScholarData[]
  totalRows: number
  skippedRows: number
  errors: string[]
}

export interface TutorUploadResult {
  inserted: number
  errors: string[]
  success: boolean
}

export function previewTutorList(excel_file: Blob): TutorPreviewResult {
  try {
    const sheets = parse_tutor_list(excel_file)
    const tutors: ScholarData[] = []
    let totalRows = 0
    let skipped = 0
    const errors: string[] = []

    // Casual Tutor sheet
    const rawTutors = sheets['Casual Tutor'] ?? []
    totalRows += rawTutors.length
    rawTutors.forEach((element: any, index: number) => {
      if (element['Full Name'] == null) { skipped++; return }
      if (!element['Unit']) {
        errors.push(`Tutor Row ${index + 2}: Missing Unit for "${element['Full Name']}"`)
        skipped++; return
      }
      tutors.push({
        name:         element['Full Name'],
        unit_name:    element['Unit Name'] ?? null,
        unit:         element['Unit'],
        role_of_unit: 'Tutor',
        staff_id:     element['Staff Number'] ? String(element['Staff Number']) : undefined,
      })
    })

    // Unit Coordinator sheet
    const rawUCs = sheets['Unic Coordinator'] ?? sheets['Unit Coordinator'] ?? sheets['Unit Coordinators'] ?? []
    totalRows += rawUCs.length
    rawUCs.forEach((element: any, index: number) => {
      const coordinatorRaw = element['Coordinator']
      const code  = element['Code']
      const title = element['Title']
      if (!coordinatorRaw || !code) { skipped++; return }

      const match   = coordinatorRaw.trim().match(/^(.+?)\s*[\{\(]\s*(\w+)\s*[\}\)]/)
      const name    = match ? match[1].trim() : coordinatorRaw.trim()
      const staffId = match ? match[2].trim() : undefined

      if (!name) { skipped++; return }
      tutors.push({
        name,
        unit_name:    title ?? null,
        unit:         code,
        role_of_unit: 'Unit Coordinator',
        staff_id:     staffId,
      })
    })

    return { tutors, totalRows, skippedRows: skipped, errors }
  } catch (err) {
    return { tutors: [], totalRows: 0, skippedRows: 0, errors: [`Parse failed: ${err instanceof Error ? err.message : String(err)}`] }
  }
}

export async function uploadTutors(tutors: ScholarData[]): Promise<TutorUploadResult> {
  if (tutors.length === 0) return { inserted: 0, errors: ['No records to upload.'], success: false }
  const { data, error } = await supabase.from('scholars').insert(tutors).select()
  if (error) return { inserted: 0, errors: [error.message], success: false }
  return { inserted: data?.length ?? tutors.length, errors: [], success: true }
}
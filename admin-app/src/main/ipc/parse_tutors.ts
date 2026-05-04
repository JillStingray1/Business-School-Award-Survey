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
  console.log(data)
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



import { IpcMainEvent } from 'electron';
import * as  xlsx from 'xlsx'

export function handleTutorList(event: IpcMainEvent, excel_file: any): void {
    const contents = xlsx.read(excel_file);
    let data: any[] = []
    const sheets = contents.SheetNames
    for (let i = 0; i < sheets.length; i++) {
        const temp = xlsx.utils.sheet_to_json(
            contents.Sheets[contents.SheetNames[i]]
        );
        temp.forEach((res) => {
            data.push(res)
        })
    }
    console.log(data)
}
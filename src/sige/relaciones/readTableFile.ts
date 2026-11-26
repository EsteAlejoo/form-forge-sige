/**
 * SIGE: lee un archivo .csv / .xlsx / .xls a filas de texto, reutilizando el
 * adaptador de SheetJS del núcleo (workbook-read.ts es el ÚNICO módulo que
 * importa `xlsx`; aquí no se importa).
 */
import { readCsvRows, readWorkbook } from '@/core/xlsform/workbook-read'

export interface TableSheet {
  name: string
  rows: string[][]
}

export const isTableFile = (filename: string): boolean => /\.(csv|xlsx|xls)$/i.test(filename)

/** CSV → una hoja; Excel → todas las hojas con datos. Delimitador `,` `;` o tab (lo detecta SheetJS). */
export const readTableSheets = async (file: File): Promise<TableSheet[]> => {
  if (/\.csv$/i.test(file.name)) {
    return [{ name: file.name, rows: readCsvRows(await file.text()) }]
  }
  const wb = readWorkbook(await file.arrayBuffer())
  return [...wb.sheets.values()]
    .filter((s) => s.rows.some((r) => r.some((c) => c !== '')))
    .map((s) => ({ name: s.name, rows: s.rows }))
}

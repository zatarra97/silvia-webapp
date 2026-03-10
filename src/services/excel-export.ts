import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import moment from 'moment'

interface Lookups {
  wards: any[]
  sites: any[]
  therapies: any[]
  bsiPathogens: any[]
  resistanceProfiles: any[]
  astAntibiotics: any[]
}

interface DynamicCounts {
  maxIsolationSites: number
  maxEmpiricalTherapies: number
  maxTargetedTherapies: number
  maxBsiPathogens: number
  maxResistanceProfiles: number
}

function computeDynamicCounts(patients: any[]): DynamicCounts {
  let maxIsolationSites = 0
  let maxEmpiricalTherapies = 0
  let maxTargetedTherapies = 0
  let maxBsiPathogens = 0
  let maxResistanceProfiles = 0

  for (const p of patients) {
    maxIsolationSites = Math.max(maxIsolationSites, p.isolationSites?.length || 0)
    maxEmpiricalTherapies = Math.max(maxEmpiricalTherapies, p.empiricalTherapies?.length || 0)
    maxTargetedTherapies = Math.max(maxTargetedTherapies, p.targetedTherapies?.length || 0)
    maxBsiPathogens = Math.max(maxBsiPathogens, p.bsiPathogens?.length || 0)
    if (p.bsiPathogens) {
      for (const bp of p.bsiPathogens) {
        maxResistanceProfiles = Math.max(maxResistanceProfiles, bp.resistanceProfiles?.length || 0)
      }
    }
  }

  return { maxIsolationSites, maxEmpiricalTherapies, maxTargetedTherapies, maxBsiPathogens, maxResistanceProfiles }
}

function buildHeaders(counts: DynamicCounts, antibiotics: any[]): string[] {
  const headers: string[] = []

  // Demographics
  headers.push('Name', 'ID', 'Date of Birth', 'Sex')

  // Clinical
  headers.push('Ward of Admission', 'BSI Onset', 'BSI Diagnosis Date')
  for (let i = 1; i <= counts.maxIsolationSites; i++) {
    headers.push(`Site of Isolation ${i}`)
  }
  headers.push('SOFA Score', 'Charlson Comorbidity Index')

  // Microbiological
  headers.push('Rectal Colonization Status', 'Rectal Colonization Pathogen')

  // BSI blocks
  for (let b = 1; b <= counts.maxBsiPathogens; b++) {
    headers.push(`BSI Pathogen ${b}`)
    for (let r = 1; r <= counts.maxResistanceProfiles; r++) {
      headers.push(`Resistance Profile ${b}.${r}`)
    }
    for (const ab of antibiotics) {
      headers.push(`AST ${ab.name} ${b}`)
      headers.push(`MIC ${ab.name} ${b}`)
    }
  }

  headers.push('Mono/Poli Microbial')

  // Therapeutic
  for (let i = 1; i <= counts.maxEmpiricalTherapies; i++) {
    headers.push(`Empirical Therapy ${i}`)
  }
  for (let i = 1; i <= counts.maxTargetedTherapies; i++) {
    headers.push(`Targeted Therapy ${i}`)
  }
  headers.push('Combination Therapy', 'Date Targeted Therapy', 'Time to Appropriate Therapy')

  // Outcome
  headers.push('30-day Mortality')

  return headers
}

function formatDateCell(value: any): string | null {
  if (!value) return null
  const m = moment(value)
  return m.isValid() ? m.format('DD/MM/YYYY') : null
}

function toNumOrNull(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function buildPatientRow(patient: any, counts: DynamicCounts, antibiotics: any[]): (string | number | null)[] {
  const row: (string | number | null)[] = []

  // Demographics
  row.push(patient.name || null)
  row.push(patient.internalId || null)
  row.push(formatDateCell(patient.dateOfBirth))
  row.push(toNumOrNull(patient.sex))

  // Clinical
  row.push(toNumOrNull(patient.wardOfAdmissionId))
  row.push(toNumOrNull(patient.bsiOnset))
  row.push(formatDateCell(patient.bsiDiagnosisDate))

  const isolationSites = patient.isolationSites || []
  for (let i = 0; i < counts.maxIsolationSites; i++) {
    row.push(isolationSites[i] ? toNumOrNull(isolationSites[i].siteOfIsolationId) : null)
  }
  row.push(toNumOrNull(patient.sofaScore))
  row.push(toNumOrNull(patient.charlsonComorbidityIndex))

  // Microbiological
  row.push(toNumOrNull(patient.rectalColonizationStatus))
  row.push(toNumOrNull(patient.rectalColonizationPathogenId))

  // BSI blocks
  const bsiPathogens = patient.bsiPathogens || []
  for (let b = 0; b < counts.maxBsiPathogens; b++) {
    const bp = bsiPathogens[b]
    row.push(bp ? toNumOrNull(bp.bsiPathogenId) : null)

    // Resistance profiles
    const rps = bp?.resistanceProfiles || []
    for (let r = 0; r < counts.maxResistanceProfiles; r++) {
      row.push(rps[r] ? toNumOrNull(rps[r].resistanceProfileId) : null)
    }

    // AST/MIC per antibiotic
    const astResults = bp?.astResults || []
    for (const ab of antibiotics) {
      const ar = astResults.find((a: any) => a.astAntibioticId === ab.id)
      row.push(ar ? toNumOrNull(ar.astValue) : null)
      row.push(ar?.micValue || null)
    }
  }

  row.push(toNumOrNull(patient.monoPoliMicrobial))

  // Therapeutic
  const empiricalTherapies = patient.empiricalTherapies || []
  for (let i = 0; i < counts.maxEmpiricalTherapies; i++) {
    row.push(empiricalTherapies[i] ? toNumOrNull(empiricalTherapies[i].antimicrobialTherapyId) : null)
  }
  const targetedTherapies = patient.targetedTherapies || []
  for (let i = 0; i < counts.maxTargetedTherapies; i++) {
    row.push(targetedTherapies[i] ? toNumOrNull(targetedTherapies[i].antimicrobialTherapyId) : null)
  }
  row.push(toNumOrNull(patient.combinationTherapy))
  row.push(formatDateCell(patient.dateTargetedTherapy))
  row.push(toNumOrNull(patient.timeToAppropriateTherapy))

  // Outcome
  row.push(toNumOrNull(patient.outcome))

  return row
}

function addDictionaryTable(
  sheet: ExcelJS.Worksheet,
  title: string,
  headers: string[],
  rows: (string | number | null)[][],
  startRow: number,
): number {
  // Title row (bold)
  const titleCell = sheet.getCell(startRow, 1)
  titleCell.value = title
  titleCell.font = { bold: true, size: 12 }
  startRow++

  // Header row
  headers.forEach((h, i) => {
    const cell = sheet.getCell(startRow, i + 1)
    cell.value = h
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
  })
  startRow++

  // Data rows
  for (const row of rows) {
    row.forEach((val, i) => {
      sheet.getCell(startRow, i + 1).value = val
    })
    startRow++
  }

  // Blank row separator
  return startRow + 1
}

function buildDictionarySheet(workbook: ExcelJS.Workbook, lookups: Lookups): void {
  const sheet = workbook.addWorksheet('Dictionary')
  sheet.getColumn(1).width = 25
  sheet.getColumn(2).width = 40

  let row = 1

  // 1. Sex
  row = addDictionaryTable(sheet, 'Sex', ['Value', 'Label'], [
    [0, 'Female'],
    [1, 'Male'],
  ], row)

  // 2. Wards of Admission
  row = addDictionaryTable(sheet, 'Wards of Admission', ['ID', 'Name'],
    lookups.wards.map((w) => [w.id, w.name]), row)

  // 3. BSI Onset
  row = addDictionaryTable(sheet, 'BSI Onset', ['Value', 'Label'], [
    [0, 'Community-acquired'],
    [1, 'Hospital-acquired'],
  ], row)

  // 4. Sites of Isolation
  row = addDictionaryTable(sheet, 'Sites of Isolation', ['ID', 'Name'],
    lookups.sites.map((s) => [s.id, s.name]), row)

  // 5. Rectal Colonization Status
  row = addDictionaryTable(sheet, 'Rectal Colonization Status', ['Value', 'Label'], [
    [0, 'No'],
    [1, 'Yes'],
  ], row)

  // 6. BSI Pathogens
  row = addDictionaryTable(sheet, 'BSI Pathogens', ['ID', 'Name'],
    lookups.bsiPathogens.map((p) => [p.id, p.name]), row)

  // 7. Resistance Profiles
  row = addDictionaryTable(sheet, 'Resistance Profiles', ['ID', 'Name'],
    lookups.resistanceProfiles.map((r) => [r.id, r.name]), row)

  // 8. AST Values
  row = addDictionaryTable(sheet, 'AST Values', ['Value', 'Label'], [
    [0, 'Not available / not tested'],
    [1, 'Resistant'],
    [2, 'Susceptible'],
    [3, 'Intermediate'],
  ], row)

  // 9. Mono/Poli Microbial
  row = addDictionaryTable(sheet, 'Mono/Poli Microbial', ['Value', 'Label'], [
    [0, 'Mono-microbial'],
    [1, 'Poli-microbial'],
  ], row)

  // 10. Antimicrobial Therapies
  row = addDictionaryTable(sheet, 'Antimicrobial Therapies', ['ID', 'Name'],
    lookups.therapies.map((t) => [t.id, t.name]), row)

  // 11. AST Antibiotics
  row = addDictionaryTable(sheet, 'AST Antibiotics', ['ID', 'Name'],
    lookups.astAntibiotics.map((a) => [a.id, a.name]), row)

  // 12. Combination Therapy
  row = addDictionaryTable(sheet, 'Combination Therapy', ['Value', 'Label'], [
    [0, 'No'],
    [1, 'Yes'],
  ], row)

  // 13. 30-day Mortality
  addDictionaryTable(sheet, '30-day Mortality', ['Value', 'Label'], [
    [0, 'Non-survivor'],
    [1, 'Survivor'],
  ], row)
}

export async function exportPatientsToExcel(patients: any[], lookups: Lookups): Promise<void> {
  const workbook = new ExcelJS.Workbook()

  // Sort antibiotics by id for consistent column order
  const antibiotics = [...lookups.astAntibiotics].sort((a, b) => a.id - b.id)

  const counts = computeDynamicCounts(patients)
  const headers = buildHeaders(counts, antibiotics)

  // --- Sheet 1: Data ---
  const dataSheet = workbook.addWorksheet('Data')

  // Add header row
  const headerRow = dataSheet.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', wrapText: true }
  })

  // Freeze header row
  dataSheet.views = [{ state: 'frozen', ySplit: 1 }]

  // Add patient rows
  for (const patient of patients) {
    const rowData = buildPatientRow(patient, counts, antibiotics)
    dataSheet.addRow(rowData)
  }

  // Auto-filter
  if (headers.length > 0) {
    dataSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    }
  }

  // Column widths
  dataSheet.columns.forEach((col) => {
    col.width = 18
  })

  // --- Sheet 2: Dictionary ---
  buildDictionarySheet(workbook, lookups)

  // Generate and save
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const filename = `patients_export_${moment().format('YYYY-MM-DD')}.xlsx`
  saveAs(blob, filename)
}

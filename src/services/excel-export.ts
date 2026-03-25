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
  maxIcPathogens: number
  maxIcResistanceProfiles: number
}

function computeDynamicCounts(patients: any[]): DynamicCounts {
  let maxIsolationSites = 0
  let maxEmpiricalTherapies = 0
  let maxTargetedTherapies = 0
  let maxBsiPathogens = 0
  let maxResistanceProfiles = 0
  let maxIcPathogens = 0
  let maxIcResistanceProfiles = 0

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
    maxIcPathogens = Math.max(maxIcPathogens, p.infectiousComplications?.length || 0)
    if (p.infectiousComplications) {
      for (const ic of p.infectiousComplications) {
        maxIcResistanceProfiles = Math.max(maxIcResistanceProfiles, ic.resistanceProfiles?.length || 0)
      }
    }
  }

  return { maxIsolationSites, maxEmpiricalTherapies, maxTargetedTherapies, maxBsiPathogens, maxResistanceProfiles, maxIcPathogens, maxIcResistanceProfiles }
}

interface HeaderEntry {
  label: string
  section: 'demographic' | 'clinical' | 'microbiological' | 'therapeutic' | 'outcome'
}

// Colors matching the form sections: green, cyan, amber, fuchsia, lime
const SECTION_COLORS: Record<HeaderEntry['section'], { bg: string; font: string }> = {
  demographic:     { bg: 'FF22C55E', font: 'FFFFFFFF' }, // green
  clinical:        { bg: 'FF06B6D4', font: 'FFFFFFFF' }, // cyan
  microbiological: { bg: 'FFF59E0B', font: 'FFFFFFFF' }, // amber
  therapeutic:     { bg: 'FFD946EF', font: 'FFFFFFFF' }, // fuchsia
  outcome:         { bg: 'FF84CC16', font: 'FFFFFFFF' }, // lime
}

function buildHeaders(counts: DynamicCounts, antibiotics: any[]): HeaderEntry[] {
  const headers: HeaderEntry[] = []
  const push = (section: HeaderEntry['section'], ...labels: string[]) => {
    for (const label of labels) headers.push({ label, section })
  }

  // Demographics
  push('demographic', 'Name', 'ID', 'Date of Birth', 'Sex')

  // Clinical
  push('clinical', 'Ward of Admission', 'BSI Onset', 'BSI Diagnosis Date')
  for (let i = 1; i <= counts.maxIsolationSites; i++) {
    push('clinical', `Site of Isolation ${i}`)
  }
  push('clinical', 'Admission Date', 'Discharge Date', 'LOS (days)', 'SOFA Score', 'Charlson Comorbidity Index')

  // Microbiological
  push('microbiological', 'Rectal Colonization Status', 'Rectal Colonization Pathogen')

  // BSI blocks
  for (let b = 1; b <= counts.maxBsiPathogens; b++) {
    push('microbiological', `BSI Pathogen ${b}`)
    for (let r = 1; r <= counts.maxResistanceProfiles; r++) {
      push('microbiological', `Resistance Profile ${b}.${r}`)
    }
    for (const ab of antibiotics) {
      push('microbiological', `AST ${ab.name} ${b}`)
      push('microbiological', `MIC ${ab.name} ${b}`)
    }
  }

  // IC blocks
  for (let b = 1; b <= counts.maxIcPathogens; b++) {
    push('microbiological', `IC Pathogen ${b}`, `IC Site of Isolation ${b}`)
    for (let r = 1; r <= counts.maxIcResistanceProfiles; r++) {
      push('microbiological', `IC Resistance Profile ${b}.${r}`)
    }
    for (const ab of antibiotics) {
      push('microbiological', `IC AST ${ab.name} ${b}`)
      push('microbiological', `IC MIC ${ab.name} ${b}`)
    }
  }

  push('microbiological', 'Mono/Poli Microbial')

  // Therapeutic
  for (let i = 1; i <= counts.maxEmpiricalTherapies; i++) {
    push('therapeutic', `Empirical Therapy ${i}`)
  }
  for (let i = 1; i <= counts.maxTargetedTherapies; i++) {
    push('therapeutic', `Targeted Therapy ${i}`)
  }
  push('therapeutic', 'Combination Therapy', 'Date Targeted Therapy', 'Time to Appropriate Therapy')

  // Outcome
  push('outcome', '30-day Mortality')

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
  row.push(formatDateCell(patient.admissionDate))
  row.push(formatDateCell(patient.dischargeDate))
  row.push(toNumOrNull(patient.los))
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

  // IC blocks
  const icPathogens = patient.infectiousComplications || []
  for (let b = 0; b < counts.maxIcPathogens; b++) {
    const ic = icPathogens[b]
    row.push(ic ? toNumOrNull(ic.bsiPathogenId) : null)
    row.push(ic ? toNumOrNull(ic.siteOfIsolationId) : null)

    // Resistance profiles
    const icRps = ic?.resistanceProfiles || []
    for (let r = 0; r < counts.maxIcResistanceProfiles; r++) {
      row.push(icRps[r] ? toNumOrNull(icRps[r].resistanceProfileId) : null)
    }

    // AST/MIC per antibiotic
    const icAstResults = ic?.astResults || []
    for (const ab of antibiotics) {
      const ar = icAstResults.find((a: any) => a.astAntibioticId === ab.id)
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


interface DictField {
  name: string
  description: string
  section: string
  type: 'enum' | 'numeric' | 'date' | 'text'
  options?: { id: number; label: string }[]
}

function buildDictFields(lookups: Lookups): DictField[] {
  const sortById = <T extends { id: number }>(arr: T[]) => [...arr].sort((a, b) => a.id - b.id)

  return [
    // DEMOGRAPHIC DATA
    { name: 'Name', description: 'Patient name', section: 'DEMOGRAPHIC DATA', type: 'text', options: [{ id: 0, label: 'text' }] },
    { name: 'ID patient', description: 'Unique patient identifier', section: 'DEMOGRAPHIC DATA', type: 'text', options: [{ id: 0, label: 'code number' }] },
    { name: 'Age', description: 'Date of birth', section: 'DEMOGRAPHIC DATA', type: 'date' },
    { name: 'Sex', description: '', section: 'DEMOGRAPHIC DATA', type: 'enum', options: [{ id: 0, label: 'Female' }, { id: 1, label: 'Male' }] },

    // CLINICAL DATA
    { name: 'Ward of admission', description: 'Hospital ward at admission', section: 'CLINICAL DATA', type: 'enum', options: sortById(lookups.wards).map(w => ({ id: w.id, label: w.name })) },
    { name: 'BSI onset', description: 'Mode of infection acquisition', section: 'CLINICAL DATA', type: 'enum', options: [{ id: 0, label: 'Community-acquired' }, { id: 1, label: 'Hospital-acquired' }, { id: 2, label: 'Healthcare-associated' }] },
    { name: 'BSI diagnosis date', description: 'Date of first positive blood culture', section: 'CLINICAL DATA', type: 'date' },
    { name: 'Site of isolation', description: '', section: 'CLINICAL DATA', type: 'enum', options: sortById(lookups.sites).map(s => ({ id: s.id, label: s.name })) },
    { name: 'Admission date', description: 'Date of hospital admission', section: 'CLINICAL DATA', type: 'date' },
    { name: 'Discharge date', description: 'Date of hospital discharge', section: 'CLINICAL DATA', type: 'date' },
    { name: 'LOS (days)', description: 'Length of stay in days (minimum 1)', section: 'CLINICAL DATA', type: 'numeric' },
    { name: 'SOFA score', description: '', section: 'CLINICAL DATA', type: 'numeric' },
    { name: 'Charlson Comorbidity Index', description: '', section: 'CLINICAL DATA', type: 'numeric' },

    // MICROBIOLOGICAL DATA
    { name: 'Rectal colonization', description: 'Detection of multidrug-resistant organisms by rectal swab', section: 'MICROBIOLOGICAL DATA', type: 'enum', options: [{ id: 0, label: 'No' }, { id: 1, label: 'Yes' }] },
    { name: 'Rectal colonization pathogen', description: 'Rectal colonization pathogen (if any)', section: 'MICROBIOLOGICAL DATA', type: 'enum', options: sortById(lookups.bsiPathogens).map(p => ({ id: p.id, label: p.name })) },
    { name: 'BSI causative pathogen', description: 'Name of the microorganism isolated from blood', section: 'MICROBIOLOGICAL DATA', type: 'enum', options: sortById(lookups.bsiPathogens).map(p => ({ id: p.id, label: p.name })) },
    { name: 'Resistance profile', description: 'Main resistance mechanism or phenotype', section: 'MICROBIOLOGICAL DATA', type: 'enum', options: sortById(lookups.resistanceProfiles).map(r => ({ id: r.id, label: r.name })) },
    { name: 'IC causative pathogen', description: 'Name of the microorganism isolated from infectious complication', section: 'MICROBIOLOGICAL DATA', type: 'enum', options: sortById(lookups.bsiPathogens).map(p => ({ id: p.id, label: p.name })) },
    { name: 'IC site of isolation', description: 'Site of isolation for infectious complication pathogen', section: 'MICROBIOLOGICAL DATA', type: 'enum', options: sortById(lookups.sites).map(s => ({ id: s.id, label: s.name })) },
    { name: 'IC resistance profile', description: 'Resistance mechanism for infectious complication pathogen', section: 'MICROBIOLOGICAL DATA', type: 'enum', options: sortById(lookups.resistanceProfiles).map(r => ({ id: r.id, label: r.name })) },
    { name: 'Mono- or poli-microbial infection', description: 'BSI caused by a single microorganism or by multiple microorganisms', section: 'MICROBIOLOGICAL DATA', type: 'enum', options: [{ id: 0, label: 'Monomicrobial' }, { id: 1, label: 'Polymicrobial' }] },
    { name: 'Antibiotic susceptibility testing (AST)', description: 'Result of antimicrobial susceptibility testing for each antibiotic', section: 'MICROBIOLOGICAL DATA', type: 'enum', options: [{ id: 0, label: 'Not available / not tested' }, { id: 1, label: 'Resistant' }, { id: 2, label: 'Susceptible' }, { id: 3, label: 'Intermediate' }] },
    { name: 'Minimum Inhibitory Concentration (MIC)', description: 'Lowest antibiotic concentration inhibiting bacterial growth', section: 'MICROBIOLOGICAL DATA', type: 'numeric' },

    // THERAPEUTIC DATA
    { name: 'Empirical antimicrobial therapy', description: 'Antibiotic treatment initiated before availability of microbiological results', section: 'THERAPEUTIC DATA', type: 'enum', options: sortById(lookups.therapies).map(t => ({ id: t.id, label: t.name })) },
    { name: 'Targeted therapy', description: 'Antibiotic treatment according to pathogen identification and resistance profile', section: 'THERAPEUTIC DATA', type: 'enum', options: sortById(lookups.therapies).map(t => ({ id: t.id, label: t.name })) },
    { name: 'Combination therapy', description: '', section: 'THERAPEUTIC DATA', type: 'enum', options: [{ id: 0, label: 'No' }, { id: 1, label: 'Yes' }] },
    { name: 'Time to appropriate therapy (days)', description: 'Time interval between BSI diagnosis date and initiation of an appropriate antimicrobial therapy', section: 'THERAPEUTIC DATA', type: 'numeric' },
    { name: 'Date targeted therapy', description: '', section: 'THERAPEUTIC DATA', type: 'date' },

    // OUTCOME
    { name: '30-day mortality', description: '', section: 'OUTCOME', type: 'enum', options: [{ id: 0, label: 'Non-survivor' }, { id: 1, label: 'Survivor' }] },
  ]
}

function buildDictionarySheet(workbook: ExcelJS.Workbook, lookups: Lookups): void {
  const sheet = workbook.addWorksheet('Data dictionary')
  const fields = buildDictFields(lookups)

  // Compute max options length to know how many rows we need
  const maxOptions = Math.max(...fields.map(f => f.options?.length || 0))

  // Build column mapping: each field takes 2 cols if enum, 1 col otherwise
  const colMap: { field: DictField; startCol: number; colSpan: number }[] = []
  let col = 1
  for (const f of fields) {
    const span = f.type === 'enum' ? 2 : 1
    colMap.push({ field: f, startCol: col, colSpan: span })
    col += span
  }
  const totalCols = col - 1

  // Set column widths
  for (let c = 1; c <= totalCols; c++) {
    sheet.getColumn(c).width = 20
  }

  // --- Row 1: Section headers ---
  const sectionHeaderFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
  const sectionHeaderFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }

  // Group fields by section to merge section headers
  let prevSection = ''
  let sectionStart = 0
  const sectionRanges: { section: string; start: number; end: number }[] = []
  for (const cm of colMap) {
    if (cm.field.section !== prevSection) {
      if (prevSection) {
        sectionRanges.push({ section: prevSection, start: sectionStart, end: cm.startCol - 1 })
      }
      prevSection = cm.field.section
      sectionStart = cm.startCol
    }
  }
  if (prevSection) {
    sectionRanges.push({ section: prevSection, start: sectionStart, end: totalCols })
  }

  for (const sr of sectionRanges) {
    const cell = sheet.getCell(1, sr.start)
    cell.value = sr.section
    cell.font = sectionHeaderFont
    cell.fill = sectionHeaderFill
    cell.alignment = { horizontal: 'center' }
    if (sr.end > sr.start) {
      sheet.mergeCells(1, sr.start, 1, sr.end)
    }
    // Fill background on all cells in range
    for (let c = sr.start; c <= sr.end; c++) {
      const fc = sheet.getCell(1, c)
      fc.fill = sectionHeaderFill
    }
  }

  // --- Row 2: Field names ---
  const fieldNameFont: Partial<ExcelJS.Font> = { bold: true, size: 10 }
  const fieldNameFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } }
  for (const cm of colMap) {
    const cell = sheet.getCell(2, cm.startCol)
    cell.value = cm.field.name
    cell.font = fieldNameFont
    cell.fill = fieldNameFill
    cell.alignment = { wrapText: true }
    if (cm.colSpan === 2) {
      sheet.mergeCells(2, cm.startCol, 2, cm.startCol + 1)
      sheet.getCell(2, cm.startCol + 1).fill = fieldNameFill
    }
  }

  // --- Row 3: Descriptions ---
  const descFont: Partial<ExcelJS.Font> = { italic: true, size: 9, color: { argb: 'FF666666' } }
  for (const cm of colMap) {
    if (cm.field.description) {
      const cell = sheet.getCell(3, cm.startCol)
      cell.value = cm.field.description
      cell.font = descFont
      cell.alignment = { wrapText: true }
      if (cm.colSpan === 2) {
        sheet.mergeCells(3, cm.startCol, 3, cm.startCol + 1)
      }
    }
  }

  // --- Row 4+: Values ---
  for (let i = 0; i < maxOptions; i++) {
    const rowNum = 4 + i
    for (const cm of colMap) {
      if (cm.field.type === 'enum' && cm.field.options && i < cm.field.options.length) {
        const opt = cm.field.options[i]
        sheet.getCell(rowNum, cm.startCol).value = opt.id
        sheet.getCell(rowNum, cm.startCol).alignment = { horizontal: 'center' }
        sheet.getCell(rowNum, cm.startCol + 1).value = opt.label
      } else if (cm.field.type === 'numeric' && i === 0) {
        sheet.getCell(rowNum, cm.startCol).value = 'numeric value'
        sheet.getCell(rowNum, cm.startCol).font = { italic: true, color: { argb: 'FF888888' } }
      } else if (cm.field.type === 'date' && i === 0) {
        sheet.getCell(rowNum, cm.startCol).value = 'Date (dd/mm/yyyy)'
        sheet.getCell(rowNum, cm.startCol).font = { italic: true, color: { argb: 'FF888888' } }
      } else if (cm.field.type === 'text' && cm.field.options && i < cm.field.options.length) {
        sheet.getCell(rowNum, cm.startCol).value = cm.field.options[i].label
        sheet.getCell(rowNum, cm.startCol).font = { italic: true, color: { argb: 'FF888888' } }
      }
    }
  }

  // Freeze first 3 rows
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

export async function exportPatientsToExcel(patients: any[], lookups: Lookups): Promise<void> {
  const workbook = new ExcelJS.Workbook()

  // Sort all lookups by id for consistent order
  lookups.wards = [...lookups.wards].sort((a, b) => a.id - b.id)
  lookups.sites = [...lookups.sites].sort((a, b) => a.id - b.id)
  lookups.therapies = [...lookups.therapies].sort((a, b) => a.id - b.id)
  lookups.bsiPathogens = [...lookups.bsiPathogens].sort((a, b) => a.id - b.id)
  lookups.resistanceProfiles = [...lookups.resistanceProfiles].sort((a, b) => a.id - b.id)
  lookups.astAntibiotics = [...lookups.astAntibiotics].sort((a, b) => a.id - b.id)
  const antibiotics = lookups.astAntibiotics

  const counts = computeDynamicCounts(patients)
  const headerEntries = buildHeaders(counts, antibiotics)
  const headerLabels = headerEntries.map(h => h.label)

  // --- Sheet 1: Data ---
  const dataSheet = workbook.addWorksheet('Data')

  // Add header row with section colors
  const headerRow = dataSheet.addRow(headerLabels)
  headerRow.eachCell((cell, colNumber) => {
    const entry = headerEntries[colNumber - 1]
    const colors = SECTION_COLORS[entry.section]
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } }
    cell.font = { bold: true, color: { argb: colors.font } }
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
  if (headerLabels.length > 0) {
    dataSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headerLabels.length },
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

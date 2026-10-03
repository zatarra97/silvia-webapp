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
  section: 'demographic' | 'clinical' | 'microbiological' | 'infectiousComplication' | 'therapeutic' | 'outcome'
}

// Colors matching the form sections: green, cyan, amber, orange, fuchsia, lime.
// Le complicanze infettive condividono la sezione microbiologica ma usano
// l'arancione, per distinguerle a colpo d'occhio dai patogeni della BSI.
const SECTION_COLORS: Record<HeaderEntry['section'], { bg: string; font: string }> = {
  demographic:            { bg: 'FF22C55E', font: 'FFFFFFFF' }, // green
  clinical:               { bg: 'FF06B6D4', font: 'FFFFFFFF' }, // cyan
  microbiological:        { bg: 'FFF59E0B', font: 'FFFFFFFF' }, // amber
  infectiousComplication: { bg: 'FFEA580C', font: 'FFFFFFFF' }, // orange
  therapeutic:            { bg: 'FFD946EF', font: 'FFFFFFFF' }, // fuchsia
  outcome:                { bg: 'FF84CC16', font: 'FFFFFFFF' }, // lime
}

// Intestazioni di sezione usate nel foglio "Data dictionary"
const SECTION_TITLES: Record<HeaderEntry['section'], string> = {
  demographic:            'DEMOGRAPHIC DATA',
  clinical:               'CLINICAL DATA',
  microbiological:        'MICROBIOLOGICAL DATA',
  infectiousComplication: 'INFECTIOUS COMPLICATION',
  therapeutic:            'THERAPEUTIC DATA',
  outcome:                'OUTCOME',
}

function buildHeaders(counts: DynamicCounts, antibiotics: any[]): HeaderEntry[] {
  const headers: HeaderEntry[] = []
  const push = (section: HeaderEntry['section'], ...labels: string[]) => {
    for (const label of labels) headers.push({ label, section })
  }

  // Demographics — il nome del paziente non viene esportato
  push('demographic', 'Patient_ID', 'Episode_ID', 'Episode_number', 'Date of Birth', 'Sex')

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
    push('infectiousComplication', `IC Pathogen ${b}`, `IC Site of Isolation ${b}`)
    for (let r = 1; r <= counts.maxIcResistanceProfiles; r++) {
      push('infectiousComplication', `IC Resistance Profile ${b}.${r}`)
    }
    for (const ab of antibiotics) {
      push('infectiousComplication', `IC AST ${ab.name} ${b}`)
      push('infectiousComplication', `IC MIC ${ab.name} ${b}`)
    }
  }

  push('microbiological', 'Mono/Poli Microbial')
  push('microbiological', 'resistance_group_final', ...RESISTANCE_MARKERS.map(m => m.label), 'Carbapenem resistant')

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

// Gruppi di resistenza (resistance_group_final): calcolati dal backend,
// solo per gli episodi mono-microbial
const RESISTANCE_GROUPS = [
  { id: 1, label: 'ESBL/AmpC carbapenem-susceptible' },
  { id: 2, label: 'CRE/CPE' },
  { id: 3, label: 'CRAB' },
  { id: 4, label: 'CRPA' },
  { id: 5, label: 'Other MDR Enterobacterales' },
]

// Meccanismi di resistenza esportati come colonne Sì/No distinte, accanto al
// gruppo sintetico. Riconosciuti dal nome del resistance profile.
const RESISTANCE_MARKERS: { label: string; pattern: RegExp }[] = [
  { label: 'ESBL', pattern: /\besbl\b/i },
  { label: 'AmpC', pattern: /\bampc\b/i },
  { label: 'KPC', pattern: /\bkpc\b/i },
  { label: 'OXA-48-like', pattern: /\boxa-?48\b/i },
  { label: 'NDM', pattern: /\bndm\b/i },
  { label: 'VIM', pattern: /\bvim\b/i },
  { label: 'MDR', pattern: /\bmdr\b/i },
]

// Come nel backend: solo imipenem e meropenem (l'ertapenem da solo non basta)
const CARBAPENEM = /^(imipenem|meropenem)$/i
const AST_RESISTANT = 1

// Valori Sì/No a livello di episodio: 1 se almeno un patogeno BSI ha il meccanismo
function resistanceMarkerValues(patient: any, profileNames: Map<number, string>, antibiotics: any[]): number[] {
  const bsiPathogens = patient.bsiPathogens || []
  const profiles: string[] = bsiPathogens.flatMap((bp: any) =>
    (bp.resistanceProfiles || []).map((rp: any) => profileNames.get(rp.resistanceProfileId) || ''))
  const carbapenemIds = new Set(antibiotics.filter(ab => CARBAPENEM.test(ab.name)).map(ab => ab.id))
  const carbapenemResistant = bsiPathogens.some((bp: any) =>
    (bp.astResults || []).some((ar: any) => carbapenemIds.has(ar.astAntibioticId) && toNumOrNull(ar.astValue) === AST_RESISTANT))

  return [
    ...RESISTANCE_MARKERS.map(m => (profiles.some(p => m.pattern.test(p)) ? 1 : 0)),
    carbapenemResistant ? 1 : 0,
  ]
}

interface PatientEpisode {
  patientId: number
  episodeNumber: number
}

// Chiave di identità del paziente: nome e cognome (normalizzati) + data di nascita.
// Senza uno dei due dati non si può riconoscere un paziente ripresentato,
// quindi il record resta a sé (chiave univoca basata sull'indice).
function patientIdentityKey(patient: any, index: number): string {
  const name = String(patient.name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
  const dob = patient.dateOfBirth ? moment(patient.dateOfBirth) : null
  if (!name || !dob?.isValid()) return `__unmatched_${index}`
  return `${name}|${dob.format('YYYY-MM-DD')}`
}

// Calcola Patient_ID ed Episode_number per ogni riga esportata (stesso ordine di `patients`).
// - Patient_ID: progressivo da 0, assegnato in ordine di prima comparsa nell'export;
//   i ricoveri dello stesso paziente condividono lo stesso valore.
// - Episode_number: 0 per il ricovero con admission date più vecchia, poi 1, 2, ...
//   I ricoveri senza admission date vanno in coda.
function computePatientEpisodes(patients: any[]): PatientEpisode[] {
  const groups = new Map<string, number[]>()
  patients.forEach((p, i) => {
    const key = patientIdentityKey(p, i)
    const indexes = groups.get(key)
    if (indexes) indexes.push(i)
    else groups.set(key, [i])
  })

  const admissionTime = (p: any): number => {
    const m = p.admissionDate ? moment(p.admissionDate) : null
    return m?.isValid() ? m.valueOf() : Number.POSITIVE_INFINITY
  }

  const result: PatientEpisode[] = new Array(patients.length)
  let patientId = 0
  for (const indexes of groups.values()) {
    const sorted = [...indexes].sort((a, b) => {
      const ta = admissionTime(patients[a])
      const tb = admissionTime(patients[b])
      if (ta !== tb) return ta < tb ? -1 : 1
      return (patients[a].id ?? 0) - (patients[b].id ?? 0)
    })
    sorted.forEach((idx, episodeNumber) => {
      result[idx] = { patientId, episodeNumber }
    })
    patientId++
  }
  return result
}

function buildPatientRow(patient: any, episode: PatientEpisode, counts: DynamicCounts, antibiotics: any[], profileNames: Map<number, string>): (string | number | null)[] {
  const row: (string | number | null)[] = []

  // Demographics — il nome del paziente non viene esportato
  row.push(episode.patientId)
  row.push(patient.internalId || null) // Episode_ID: numero di cartella clinica del ricovero
  row.push(episode.episodeNumber)
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
  row.push(toNumOrNull(patient.resistanceGroup))
  row.push(...resistanceMarkerValues(patient, profileNames, antibiotics))

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
  section: HeaderEntry['section']
  type: 'enum' | 'numeric' | 'date' | 'text'
  options?: { id: number; label: string }[]
}

function buildDictFields(lookups: Lookups): DictField[] {
  const sortById = <T extends { id: number }>(arr: T[]) => [...arr].sort((a, b) => a.id - b.id)

  return [
    // DEMOGRAPHIC DATA
    { name: 'Patient_ID', description: 'Progressive patient identifier starting from 0. The same value is repeated when a patient has more than one episode (patients are matched by full name and date of birth)', section: 'demographic', type: 'numeric' },
    { name: 'Episode_ID', description: 'Medical record number (internal ID) identifying the single hospital admission (episode)', section: 'demographic', type: 'text', options: [{ id: 0, label: 'code number' }] },
    { name: 'Episode_number', description: 'Progressive number of the episode for the same patient, ordered by admission date: 0 = first episode, 1 = second episode, and so on', section: 'demographic', type: 'numeric' },
    { name: 'Age', description: 'Date of birth', section: 'demographic', type: 'date' },
    { name: 'Sex', description: '', section: 'demographic', type: 'enum', options: [{ id: 0, label: 'Female' }, { id: 1, label: 'Male' }] },

    // CLINICAL DATA
    { name: 'Ward of admission', description: 'Hospital ward at admission', section: 'clinical', type: 'enum', options: sortById(lookups.wards).map(w => ({ id: w.id, label: w.name })) },
    { name: 'BSI onset', description: 'Mode of infection acquisition', section: 'clinical', type: 'enum', options: [{ id: 0, label: 'Community-acquired' }, { id: 1, label: 'Hospital-acquired' }, { id: 2, label: 'Healthcare-associated' }] },
    { name: 'BSI diagnosis date', description: 'Date of first positive blood culture', section: 'clinical', type: 'date' },
    { name: 'Site of isolation', description: '', section: 'clinical', type: 'enum', options: sortById(lookups.sites).map(s => ({ id: s.id, label: s.name })) },
    { name: 'Admission date', description: 'Date of hospital admission', section: 'clinical', type: 'date' },
    { name: 'Discharge date', description: 'Date of hospital discharge', section: 'clinical', type: 'date' },
    { name: 'LOS (days)', description: 'Length of stay in days (minimum 1)', section: 'clinical', type: 'numeric' },
    { name: 'SOFA score', description: '', section: 'clinical', type: 'numeric' },
    { name: 'Charlson Comorbidity Index', description: '', section: 'clinical', type: 'numeric' },

    // MICROBIOLOGICAL DATA
    { name: 'Rectal colonization', description: 'Detection of multidrug-resistant organisms by rectal swab', section: 'microbiological', type: 'enum', options: [{ id: 0, label: 'No' }, { id: 1, label: 'Yes' }] },
    { name: 'Rectal colonization pathogen', description: 'Rectal colonization pathogen (if any)', section: 'microbiological', type: 'enum', options: sortById(lookups.bsiPathogens).map(p => ({ id: p.id, label: p.name })) },
    { name: 'BSI causative pathogen', description: 'Name of the microorganism isolated from blood', section: 'microbiological', type: 'enum', options: sortById(lookups.bsiPathogens).map(p => ({ id: p.id, label: p.name })) },
    { name: 'Resistance profile', description: 'Main resistance mechanism or phenotype', section: 'microbiological', type: 'enum', options: sortById(lookups.resistanceProfiles).map(r => ({ id: r.id, label: r.name })) },
    { name: 'IC causative pathogen', description: 'Name of the microorganism isolated from infectious complication', section: 'microbiological', type: 'enum', options: sortById(lookups.bsiPathogens).map(p => ({ id: p.id, label: p.name })) },
    { name: 'IC site of isolation', description: 'Site of isolation for infectious complication pathogen', section: 'microbiological', type: 'enum', options: sortById(lookups.sites).map(s => ({ id: s.id, label: s.name })) },
    { name: 'IC resistance profile', description: 'Resistance mechanism for infectious complication pathogen', section: 'microbiological', type: 'enum', options: sortById(lookups.resistanceProfiles).map(r => ({ id: r.id, label: r.name })) },
    { name: 'Mono- or poli-microbial infection', description: 'BSI caused by a single microorganism or by multiple microorganisms', section: 'microbiological', type: 'enum', options: [{ id: 0, label: 'Monomicrobial' }, { id: 1, label: 'Polymicrobial' }] },
    { name: 'resistance_group_final', description: 'Final resistance group, mutually exclusive, assigned only to monomicrobial episodes (empty for polymicrobial). Hierarchy: CRAB (A. baumannii carbapenem-resistant) > CRPA (P. aeruginosa carbapenem-resistant) > CRE/CPE (Enterobacterales with KPC, OXA-48-like, NDM, VIM, KRE or imipenem/meropenem resistant) > ESBL/AmpC carbapenem-susceptible (documented imipenem/meropenem susceptibility) > Other MDR Enterobacterales. Group 1 is the internal comparison group (reference category)', section: 'microbiological', type: 'enum', options: RESISTANCE_GROUPS },
    ...RESISTANCE_MARKERS.map(m => ({ name: m.label, description: `${m.label} detected in at least one BSI pathogen (from resistance profiles)`, section: 'microbiological' as const, type: 'enum' as const, options: [{ id: 0, label: 'No' }, { id: 1, label: 'Yes' }] })),
    { name: 'Carbapenem resistant', description: 'At least one BSI pathogen resistant to imipenem or meropenem (AST). Ertapenem alone is not considered', section: 'microbiological', type: 'enum', options: [{ id: 0, label: 'No' }, { id: 1, label: 'Yes' }] },
    { name: 'Antibiotic susceptibility testing (AST)', description: 'Result of antimicrobial susceptibility testing for each antibiotic', section: 'microbiological', type: 'enum', options: [{ id: 0, label: 'Not available / not tested' }, { id: 1, label: 'Resistant' }, { id: 2, label: 'Susceptible' }, { id: 3, label: 'Intermediate' }] },
    { name: 'Minimum Inhibitory Concentration (MIC)', description: 'Lowest antibiotic concentration inhibiting bacterial growth', section: 'microbiological', type: 'numeric' },

    // THERAPEUTIC DATA
    { name: 'Empirical antimicrobial therapy', description: 'Antibiotic treatment initiated before availability of microbiological results', section: 'therapeutic', type: 'enum', options: sortById(lookups.therapies).map(t => ({ id: t.id, label: t.name })) },
    { name: 'Targeted therapy', description: 'Antibiotic treatment according to pathogen identification and resistance profile', section: 'therapeutic', type: 'enum', options: sortById(lookups.therapies).map(t => ({ id: t.id, label: t.name })) },
    { name: 'Combination therapy', description: '', section: 'therapeutic', type: 'enum', options: [{ id: 0, label: 'No' }, { id: 1, label: 'Yes' }] },
    { name: 'Time to appropriate therapy (days)', description: 'Time interval between BSI diagnosis date and initiation of an appropriate antimicrobial therapy', section: 'therapeutic', type: 'numeric' },
    { name: 'Date targeted therapy', description: '', section: 'therapeutic', type: 'date' },

    // OUTCOME
    { name: '30-day mortality', description: '', section: 'outcome', type: 'enum', options: [{ id: 0, label: 'Non-survivor' }, { id: 1, label: 'Survivor' }] },
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
  // Stessi colori delle intestazioni dei fogli dati: le schede si
  // leggono con la stessa chiave visiva.
  const sectionHeaderFont: Partial<ExcelJS.Font> = { bold: true, size: 11 }

  // Group fields by section to merge section headers
  let prevSection: HeaderEntry['section'] | null = null
  let sectionStart = 0
  const sectionRanges: { section: HeaderEntry['section']; start: number; end: number }[] = []
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
    const colors = SECTION_COLORS[sr.section]
    const sectionFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } }
    const cell = sheet.getCell(1, sr.start)
    cell.value = SECTION_TITLES[sr.section]
    cell.font = { ...sectionHeaderFont, color: { argb: colors.font } }
    cell.fill = sectionFill
    cell.alignment = { horizontal: 'center' }
    if (sr.end > sr.start) {
      sheet.mergeCells(1, sr.start, 1, sr.end)
    }
    // Fill background on all cells in range
    for (let c = sr.start; c <= sr.end; c++) {
      const fc = sheet.getCell(1, c)
      fc.fill = sectionFill
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

function buildDataSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: { patient: any; episode: PatientEpisode }[],
  antibiotics: any[],
  profileNames: Map<number, string>,
): void {
  const counts = computeDynamicCounts(rows.map(r => r.patient))
  const headerEntries = buildHeaders(counts, antibiotics)
  const headerLabels = headerEntries.map(h => h.label)

  const sheet = workbook.addWorksheet(name)

  // Add header row with section colors
  const headerRow = sheet.addRow(headerLabels)
  headerRow.eachCell((cell, colNumber) => {
    const entry = headerEntries[colNumber - 1]
    const colors = SECTION_COLORS[entry.section]
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } }
    cell.font = { bold: true, color: { argb: colors.font } }
    cell.alignment = { horizontal: 'center', wrapText: true }
  })

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  // Add patient rows
  for (const { patient, episode } of rows) {
    sheet.addRow(buildPatientRow(patient, episode, counts, antibiotics, profileNames))
  }

  // Auto-filter
  if (headerLabels.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headerLabels.length },
    }
  }

  // Column widths
  sheet.columns.forEach((col) => {
    col.width = 18
  })
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

  // Patient_ID ed Episode_number si calcolano su tutti i pazienti, prima della
  // divisione in fogli: lo stesso paziente mantiene lo stesso Patient_ID anche
  // se i suoi episodi finiscono in fogli diversi.
  const episodes = computePatientEpisodes(patients)
  const profileNames = new Map<number, string>(lookups.resistanceProfiles.map(rp => [rp.id, rp.name]))
  const rows = patients.map((patient, i) => ({ patient, episode: episodes[i], type: toNumOrNull(patient.monoPoliMicrobial) }))

  // Un foglio per tipo di infezione (campo "Mono- or poli-microbial infection").
  // Le colonne dinamiche sono calcolate per foglio, quindi nel foglio
  // mono-microbial i blocchi microbiologici non si ripetono.
  buildDataSheet(workbook, 'Mono-microbial', rows.filter(r => r.type === 0), antibiotics, profileNames)
  buildDataSheet(workbook, 'Poli-microbial', rows.filter(r => r.type === 1), antibiotics, profileNames)

  // Pazienti senza il campo compilato: foglio a parte, solo se ce ne sono
  const unclassified = rows.filter(r => r.type !== 0 && r.type !== 1)
  if (unclassified.length > 0) {
    buildDataSheet(workbook, 'Not classified', unclassified, antibiotics, profileNames)
  }

  // --- Dictionary ---
  buildDictionarySheet(workbook, lookups)

  // Generate and save
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const filename = `patients_export_${moment().format('YYYY-MM-DD')}.xlsx`
  saveAs(blob, filename)
}

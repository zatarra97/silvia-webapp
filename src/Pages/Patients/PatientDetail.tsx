import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import PageHeader from '../../Components/PageHeader'
import FormSection from '../../Components/FormSection'
import FormErrors from '../../Components/FormErrors'
import Input from '../../Components/Input'
import Select from '../../Components/Select'
import DateTimePicker from '../../Components/DateTimePicker'
import { getItem, getList, createItem, updateItem } from '../../services/api-utility'
import { ENTITIES } from '../../constants'
import { patientSchema, type PatientFormData } from './patientSchema'

const SEX_OPTIONS = [
  { value: 0, label: 'Female' },
  { value: 1, label: 'Male' },
]

const BSI_ONSET_OPTIONS = [
  { value: 0, label: 'Community-acquired' },
  { value: 1, label: 'Hospital-acquired' },
  { value: 2, label: 'Healthcare-associated' },
]

const RECTAL_COLONIZATION_OPTIONS = [
  { value: 0, label: 'No' },
  { value: 1, label: 'Yes' },
]

const MONO_POLI_OPTIONS = [
  { value: 0, label: 'Mono-microbial' },
  { value: 1, label: 'Poli-microbial' },
]

const COMBINATION_THERAPY_OPTIONS = [
  { value: 0, label: 'No' },
  { value: 1, label: 'Yes' },
]

const OUTCOME_OPTIONS = [
  { value: 0, label: 'Non-survivor' },
  { value: 1, label: 'Survivor' },
]

const AST_VALUE_OPTIONS = [
  { value: 0, label: 'Not available / not tested' },
  { value: 1, label: 'Resistant' },
  { value: 2, label: 'Susceptible' },
  { value: 3, label: 'Intermediate' },
]

interface AstResultEntry {
  astAntibioticId: number | null
  astValue: number | string | null
  micValue: string
}

interface BsiPathogenEntry {
  bsiPathogenId: number | string | null
  siteOfIsolationId: number | string | null
  resistanceProfileIds: number[]
  astResults: AstResultEntry[]
}

const ordinal = (n: number) => {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [wards, setWards] = useState<any[]>([])
  const [sitesOptions, setSitesOptions] = useState<any[]>([])
  const [therapiesOptions, setTherapiesOptions] = useState<any[]>([])
  const [bsiPathogensOptions, setBsiPathogensOptions] = useState<any[]>([])
  const [resistanceProfilesOptions, setResistanceProfilesOptions] = useState<any[]>([])
  const [astAntibioticsOptions, setAstAntibioticsOptions] = useState<any[]>([])
  const [empiricalTherapies, setEmpiricalTherapies] = useState<{ antimicrobialTherapyId: string | number | null }[]>([])
  const [targetedTherapies, setTargetedTherapies] = useState<{ antimicrobialTherapyId: string | number | null }[]>([])
  const [bsiPathogens, setBsiPathogens] = useState<BsiPathogenEntry[]>([])
  const [infectiousComplications, setInfectiousComplications] = useState<BsiPathogenEntry[]>([])

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      internalId: '',
      dateOfBirth: null,
      sex: null,
      wardOfAdmissionId: null,
      bsiOnset: null,
      bsiDiagnosisDate: null,
      sofaScore: null,
      charlsonComorbidityIndex: null,
      rectalColonizationStatus: null,
      rectalColonizationPathogenId: null,
      monoPoliMicrobial: null,
      combinationTherapy: null,
      dateTargetedTherapy: null,
      timeToAppropriateTherapy: null,
      outcome: null,
    },
  })

  const watchedBsiDiagnosisDate = watch('bsiDiagnosisDate')
  const watchedDateTargetedTherapy = watch('dateTargetedTherapy')
  const watchedAdmissionDate = watch('admissionDate')
  const watchedDischargeDate = watch('dischargeDate')

  useEffect(() => {
    if (watchedBsiDiagnosisDate && watchedDateTargetedTherapy) {
      const start = new Date(watchedBsiDiagnosisDate)
      const end = new Date(watchedDateTargetedTherapy)
      const diffMs = end.getTime() - start.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      setValue('timeToAppropriateTherapy', diffDays < 0 ? 0 : diffDays)
    }
  }, [watchedBsiDiagnosisDate, watchedDateTargetedTherapy, setValue])

  useEffect(() => {
    if (watchedAdmissionDate && watchedDischargeDate) {
      const start = new Date(watchedAdmissionDate)
      const end = new Date(watchedDischargeDate)
      const diffMs = end.getTime() - start.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      setValue('los', diffDays < 1 ? 1 : diffDays)
    }
  }, [watchedAdmissionDate, watchedDischargeDate, setValue])

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [wardData, siteData, therapyData, bsiPathogenData, rpData, astData] = await Promise.all([
          getList(ENTITIES.WARDS_OF_ADMISSION, {}, { limit: 1000 }, 'id ASC'),
          getList(ENTITIES.SITES_OF_ISOLATION, {}, { limit: 1000 }, 'id ASC'),
          getList(ENTITIES.ANTIMICROBIAL_THERAPIES, {}, { limit: 1000 }, 'id ASC'),
          getList(ENTITIES.BSI_PATHOGENS, {}, { limit: 1000 }, 'id ASC'),
          getList(ENTITIES.RESISTANCE_PROFILES, {}, { limit: 1000 }, 'id ASC'),
          getList(ENTITIES.AST_ANTIBIOTICS, {}, { limit: 1000 }, 'id ASC'),
        ])
        setWards(wardData)
        setSitesOptions(siteData)
        setTherapiesOptions(therapyData)
        setBsiPathogensOptions(bsiPathogenData)
        setResistanceProfilesOptions(rpData)
        setAstAntibioticsOptions(astData)
      } catch (e) {
        console.error(e)
      }
    }
    fetchLookups()
  }, [])

  const mapPathogenEntries = (pathogens: any[], isolationSites: any[] | undefined): BsiPathogenEntry[] =>
    pathogens.map((bp: any, idx: number) => ({
      bsiPathogenId: bp.bsiPathogenId ?? null,
      siteOfIsolationId: isolationSites?.[idx]?.siteOfIsolationId ?? null,
      resistanceProfileIds: bp.resistanceProfiles
        ? bp.resistanceProfiles.map((rp: any) => rp.resistanceProfileId)
        : [],
      astResults: (bp.astResults || []).map((ar: any) => ({
        astAntibioticId: ar.astAntibioticId,
        astValue: ar.astValue ?? null,
        micValue: ar.micValue || '',
      })),
    }))

  useEffect(() => {
    if (!isEdit || astAntibioticsOptions.length === 0) return
    const fetchPatient = async () => {
      setLoading(true)
      try {
        const data = await getItem(ENTITIES.PATIENTS, id!)
        reset({
          name: data.name || '',
          internalId: data.internalId || '',
          dateOfBirth: data.dateOfBirth || null,
          sex: data.sex ?? null,
          wardOfAdmissionId: data.wardOfAdmissionId ?? null,
          bsiOnset: data.bsiOnset ?? null,
          bsiDiagnosisDate: data.bsiDiagnosisDate || null,
          admissionDate: data.admissionDate || null,
          dischargeDate: data.dischargeDate || null,
          los: data.los ?? null,
          sofaScore: data.sofaScore ?? null,
          charlsonComorbidityIndex: data.charlsonComorbidityIndex ?? null,
          rectalColonizationStatus: data.rectalColonizationStatus ?? null,
          rectalColonizationPathogenId: data.rectalColonizationPathogenId ?? null,
          monoPoliMicrobial: data.monoPoliMicrobial ?? null,
          combinationTherapy: data.combinationTherapy ?? null,
          dateTargetedTherapy: data.dateTargetedTherapy || null,
          timeToAppropriateTherapy: data.timeToAppropriateTherapy ?? null,
          outcome: data.outcome ?? null,
        })
        if (data.empiricalTherapies && data.empiricalTherapies.length > 0) {
          setEmpiricalTherapies(
            data.empiricalTherapies.map((t: any) => ({
              antimicrobialTherapyId: t.antimicrobialTherapyId ?? null,
            }))
          )
        }
        if (data.targetedTherapies && data.targetedTherapies.length > 0) {
          setTargetedTherapies(
            data.targetedTherapies.map((t: any) => ({
              antimicrobialTherapyId: t.antimicrobialTherapyId ?? null,
            }))
          )
        }
        if (data.bsiPathogens && data.bsiPathogens.length > 0) {
          setBsiPathogens(mapPathogenEntries(data.bsiPathogens, data.isolationSites))
        }
        if (data.infectiousComplications && data.infectiousComplications.length > 0) {
          setInfectiousComplications(mapPathogenEntries(data.infectiousComplications, undefined))
        }
      } catch (e) {
        toast.error('Errore nel caricamento del paziente')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchPatient()
  }, [id, isEdit, reset, astAntibioticsOptions])

  const toNum = (v: any) => (v !== null && v !== '' && v !== undefined ? Number(v) : null)

  const buildPathogenPayload = (entries: BsiPathogenEntry[]) =>
    entries
      .filter((bp) => bp.bsiPathogenId !== null && bp.bsiPathogenId !== '')
      .map((bp, idx) => ({
        bsiPathogenId: Number(bp.bsiPathogenId),
        pathogenOrder: idx + 1,
        resistanceProfiles: bp.resistanceProfileIds.map((rpId) => ({
          resistanceProfileId: rpId,
        })),
        astResults: bp.astResults
          .filter((ar) => ar.astAntibioticId !== null)
          .map((ar) => ({
            astAntibioticId: ar.astAntibioticId!,
            astValue: ar.astValue !== null && ar.astValue !== '' ? Number(ar.astValue) : null,
            micValue: ar.micValue || null,
          })),
      }))

  const onSubmit = async (formData: PatientFormData) => {
    setSaving(true)
    try {
      const payload: any = {
        name: formData.name,
        internalId: formData.internalId || null,
        dateOfBirth: formData.dateOfBirth || null,
        sex: toNum(formData.sex),
        wardOfAdmissionId: toNum(formData.wardOfAdmissionId),
        bsiOnset: toNum(formData.bsiOnset),
        bsiDiagnosisDate: formData.bsiDiagnosisDate || null,
        admissionDate: formData.admissionDate || null,
        dischargeDate: formData.dischargeDate || null,
        los: toNum(formData.los),
        sofaScore: toNum(formData.sofaScore),
        charlsonComorbidityIndex: toNum(formData.charlsonComorbidityIndex),
        rectalColonizationStatus: toNum(formData.rectalColonizationStatus),
        rectalColonizationPathogenId: toNum(formData.rectalColonizationPathogenId),
        monoPoliMicrobial: toNum(formData.monoPoliMicrobial),
        combinationTherapy: toNum(formData.combinationTherapy),
        dateTargetedTherapy: formData.dateTargetedTherapy || null,
        timeToAppropriateTherapy: toNum(formData.timeToAppropriateTherapy),
        outcome: toNum(formData.outcome),
        isolationSites: bsiPathogens
          .filter((bp) => bp.siteOfIsolationId !== null && bp.siteOfIsolationId !== '')
          .map((bp, idx) => ({ siteOfIsolationId: Number(bp.siteOfIsolationId), pathogenOrder: idx + 1 })),
        empiricalTherapies: empiricalTherapies
          .filter((t) => t.antimicrobialTherapyId !== null && t.antimicrobialTherapyId !== '')
          .map((t, idx) => ({ antimicrobialTherapyId: Number(t.antimicrobialTherapyId), therapyOrder: idx + 1 })),
        targetedTherapies: targetedTherapies
          .filter((t) => t.antimicrobialTherapyId !== null && t.antimicrobialTherapyId !== '')
          .map((t, idx) => ({ antimicrobialTherapyId: Number(t.antimicrobialTherapyId), therapyOrder: idx + 1 })),
        bsiPathogens: buildPathogenPayload(bsiPathogens),
        infectiousComplications: buildPathogenPayload(infectiousComplications),
      }

      if (isEdit) {
        await updateItem(ENTITIES.PATIENTS, id!, payload)
        toast.success('Paziente aggiornato con successo')
      } else {
        await createItem(ENTITIES.PATIENTS, payload)
        toast.success('Paziente creato con successo')
        navigate('/admin/patients')
      }
    } catch (e) {
      toast.error('Errore durante il salvataggio')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Empirical therapies helpers
  const addEmpiricalTherapy = () => {
    setEmpiricalTherapies((prev) => [...prev, { antimicrobialTherapyId: null }])
  }
  const removeEmpiricalTherapy = (index: number) => {
    setEmpiricalTherapies((prev) => prev.filter((_, i) => i !== index))
  }
  const updateEmpiricalTherapy = (index: number, value: string | number | null) => {
    setEmpiricalTherapies((prev) =>
      prev.map((item, i) => (i === index ? { antimicrobialTherapyId: value } : item))
    )
  }

  // Targeted therapies helpers
  const addTargetedTherapy = () => {
    setTargetedTherapies((prev) => [...prev, { antimicrobialTherapyId: null }])
  }
  const removeTargetedTherapy = (index: number) => {
    setTargetedTherapies((prev) => prev.filter((_, i) => i !== index))
  }
  const updateTargetedTherapy = (index: number, value: string | number | null) => {
    setTargetedTherapies((prev) =>
      prev.map((item, i) => (i === index ? { antimicrobialTherapyId: value } : item))
    )
  }

  // Shared pathogen entry factory
  const createEmptyPathogenEntry = (): BsiPathogenEntry => ({
    bsiPathogenId: null,
    siteOfIsolationId: null,
    resistanceProfileIds: [],
    astResults: [],
  })

  // Generic pathogen state updater
  const updatePathogenState = (
    setter: React.Dispatch<React.SetStateAction<BsiPathogenEntry[]>>,
    index: number,
    updater: (entry: BsiPathogenEntry) => BsiPathogenEntry,
  ) => {
    setter((prev) => prev.map((item, i) => (i === index ? updater(item) : item)))
  }

  // BSI Pathogens helpers
  const addBsiPathogen = () => setBsiPathogens((prev) => [...prev, createEmptyPathogenEntry()])
  const removeBsiPathogen = (index: number) => setBsiPathogens((prev) => prev.filter((_, i) => i !== index))
  const updateBsiPathogenId = (index: number, value: string | number | null) =>
    updatePathogenState(setBsiPathogens, index, (e) => ({ ...e, bsiPathogenId: value }))
  const updateBsiSiteOfIsolation = (index: number, value: string | number | null) =>
    updatePathogenState(setBsiPathogens, index, (e) => ({ ...e, siteOfIsolationId: value }))
  const toggleBsiResistanceProfile = (bsiIndex: number, rpId: number) =>
    updatePathogenState(setBsiPathogens, bsiIndex, (e) => ({
      ...e,
      resistanceProfileIds: e.resistanceProfileIds.includes(rpId)
        ? e.resistanceProfileIds.filter((id) => id !== rpId)
        : [...e.resistanceProfileIds, rpId],
    }))
  const updateBsiAstValue = (bsiIndex: number, antibioticId: number, field: 'astValue' | 'micValue', value: any) =>
    updatePathogenState(setBsiPathogens, bsiIndex, (e) => ({
      ...e,
      astResults: e.astResults.map((ar) =>
        ar.astAntibioticId === antibioticId ? { ...ar, [field]: value } : ar
      ),
    }))
  const updateBsiAstAntibioticId = (bsiIndex: number, astIndex: number, value: string | number | null) =>
    updatePathogenState(setBsiPathogens, bsiIndex, (e) => ({
      ...e,
      astResults: e.astResults.map((ar, i) =>
        i === astIndex ? { ...ar, astAntibioticId: value !== null && value !== '' ? Number(value) : null } : ar
      ),
    }))
  const addBsiAstResult = (bsiIndex: number) =>
    updatePathogenState(setBsiPathogens, bsiIndex, (e) => ({
      ...e,
      astResults: [...e.astResults, { astAntibioticId: null, astValue: null, micValue: '' }],
    }))
  const removeBsiAstResult = (bsiIndex: number, astIndex: number) =>
    updatePathogenState(setBsiPathogens, bsiIndex, (e) => ({
      ...e,
      astResults: e.astResults.filter((_, i) => i !== astIndex),
    }))

  // Infectious Complications helpers
  const addIcPathogen = () => setInfectiousComplications((prev) => [...prev, createEmptyPathogenEntry()])
  const removeIcPathogen = (index: number) => setInfectiousComplications((prev) => prev.filter((_, i) => i !== index))
  const updateIcPathogenId = (index: number, value: string | number | null) =>
    updatePathogenState(setInfectiousComplications, index, (e) => ({ ...e, bsiPathogenId: value }))
  const updateIcSiteOfIsolation = (index: number, value: string | number | null) =>
    updatePathogenState(setInfectiousComplications, index, (e) => ({ ...e, siteOfIsolationId: value }))
  const toggleIcResistanceProfile = (icIndex: number, rpId: number) =>
    updatePathogenState(setInfectiousComplications, icIndex, (e) => ({
      ...e,
      resistanceProfileIds: e.resistanceProfileIds.includes(rpId)
        ? e.resistanceProfileIds.filter((id) => id !== rpId)
        : [...e.resistanceProfileIds, rpId],
    }))
  const updateIcAstValue = (icIndex: number, antibioticId: number, field: 'astValue' | 'micValue', value: any) =>
    updatePathogenState(setInfectiousComplications, icIndex, (e) => ({
      ...e,
      astResults: e.astResults.map((ar) =>
        ar.astAntibioticId === antibioticId ? { ...ar, [field]: value } : ar
      ),
    }))
  const updateIcAstAntibioticId = (icIndex: number, astIndex: number, value: string | number | null) =>
    updatePathogenState(setInfectiousComplications, icIndex, (e) => ({
      ...e,
      astResults: e.astResults.map((ar, i) =>
        i === astIndex ? { ...ar, astAntibioticId: value !== null && value !== '' ? Number(value) : null } : ar
      ),
    }))
  const addIcAstResult = (icIndex: number) =>
    updatePathogenState(setInfectiousComplications, icIndex, (e) => ({
      ...e,
      astResults: [...e.astResults, { astAntibioticId: null, astValue: null, micValue: '' }],
    }))
  const removeIcAstResult = (icIndex: number, astIndex: number) =>
    updatePathogenState(setInfectiousComplications, icIndex, (e) => ({
      ...e,
      astResults: e.astResults.filter((_, i) => i !== astIndex),
    }))

  const wardOptions = wards.map((w) => ({ value: w.id, label: w.name }))
  const siteSelectOptions = sitesOptions.map((s) => ({ value: s.id, label: s.name }))
  const therapySelectOptions = therapiesOptions.map((t) => ({ value: t.id, label: t.name }))
  const bsiPathogenSelectOptions = bsiPathogensOptions.map((p) => ({ value: p.id, label: p.name }))
  const rectalPathogenSelectOptions = bsiPathogensOptions.map((p) => ({ value: p.id, label: p.name }))
  const allAntibioticOptions = astAntibioticsOptions.map((a) => ({ value: a.id, label: a.name }))

  if (loading) {
    return (
      <div>
        <PageHeader
          icon="fa-solid fa-hospital-user"
          title="Loading..."
          backButton={{ route: '/admin/patients' }}
        />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i>
          </div>
        </div>
      </div>
    )
  }

  // Render a pathogen group (BSI or IC) with configurable colors and callbacks
  const renderPathogenGroup = (
    entries: BsiPathogenEntry[],
    config: {
      title: string
      label: string
      borderDashed: string
      titleColor: string
      cardBorder: string
      headerColor: string
      pillSelected: string
      pillHover: string
      tableHeaderBg: string
      tableHeaderText: string
      tableBorder: string
      tableRowHover: string
      micFocus: string
      addBtnBg: string
      addBtnText: string
      addBtnHover: string
    },
    callbacks: {
      updatePathogenId: (index: number, value: string | number | null) => void
      updateSiteOfIsolation: (index: number, value: string | number | null) => void
      toggleResistanceProfile: (index: number, rpId: number) => void
      updateAstValue: (index: number, antibioticId: number, field: 'astValue' | 'micValue', value: any) => void
      updateAstAntibioticId: (pathogenIndex: number, astIndex: number, value: string | number | null) => void
      addAstResult: (pathogenIndex: number) => void
      removeAstResult: (pathogenIndex: number, astIndex: number) => void
      remove: (index: number) => void
      add: () => void
    },
    namePrefix: string,
  ) => (
    <div className={`mt-6 border-2 border-dashed ${config.borderDashed} rounded-lg p-4`}>
      <h3 className={`text-base font-semibold ${config.titleColor} mb-4`}>{config.title}</h3>

      {entries.map((bp, idx) => {
        const usedAntibioticIds = bp.astResults
          .map((ar) => ar.astAntibioticId)
          .filter((id): id is number => id !== null)

        return (
          <div key={idx} className={`border ${config.cardBorder} rounded-lg p-4 bg-white ${idx > 0 ? 'mt-4' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className={`text-sm font-semibold ${config.headerColor}`}>{ordinal(idx + 1)} {config.label}</h4>
              <button
                type="button"
                onClick={() => callbacks.remove(idx)}
                className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-sm"
                title={`Remove ${config.label.toLowerCase()}`}
              >
                <i className="fa-solid fa-trash mr-1"></i>
                Remove
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Pathogen"
                name={`${namePrefix}Pathogen_${idx}`}
                value={bp.bsiPathogenId}
                options={bsiPathogenSelectOptions}
                onChange={(e) => callbacks.updatePathogenId(idx, e.target.value)}
              />
              <Select
                label="Site of isolation"
                name={`${namePrefix}SiteOfIsolation_${idx}`}
                value={bp.siteOfIsolationId}
                options={siteSelectOptions}
                onChange={(e) => callbacks.updateSiteOfIsolation(idx, e.target.value)}
              />
            </div>

            {/* Resistance profiles */}
            <div className="mt-4">
              <label className="form-label">Resistance profiles</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {resistanceProfilesOptions.map((rp) => (
                  <button
                    key={rp.id}
                    type="button"
                    onClick={() => callbacks.toggleResistanceProfile(idx, rp.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                      bp.resistanceProfileIds.includes(rp.id)
                        ? config.pillSelected
                        : `bg-white text-gray-600 border-gray-300 ${config.pillHover}`
                    }`}
                  >
                    {rp.name}
                  </button>
                ))}
              </div>
            </div>

            {/* AST / MIC results */}
            <div className="mt-4">
              <label className="form-label">AST / MIC results</label>

              {bp.astResults.length > 0 && (
                <div className="mt-1 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className={config.tableHeaderBg}>
                        <th className={`text-left px-3 py-2 font-medium ${config.tableHeaderText} border ${config.tableBorder}`}>Antibiotic</th>
                        <th className={`text-left px-3 py-2 font-medium ${config.tableHeaderText} border ${config.tableBorder} w-64`}>AST</th>
                        <th className={`text-left px-3 py-2 font-medium ${config.tableHeaderText} border ${config.tableBorder} w-32`}>MIC</th>
                        <th className={`px-2 py-2 border ${config.tableBorder} w-10`}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bp.astResults.map((ar, astIdx) => {
                        const availableOptions = allAntibioticOptions.filter(
                          (opt) => opt.value === ar.astAntibioticId || !usedAntibioticIds.includes(opt.value)
                        )
                        return (
                          <tr key={astIdx} className={config.tableRowHover}>
                            <td className={`px-1 py-1 border ${config.tableBorder}`}>
                              <Select
                                name={`${namePrefix}AstAntibiotic_${idx}_${astIdx}`}
                                value={ar.astAntibioticId}
                                options={availableOptions}
                                onChange={(e) => callbacks.updateAstAntibioticId(idx, astIdx, e.target.value)}
                              />
                            </td>
                            <td className={`px-1 py-1 border ${config.tableBorder}`}>
                              <Select
                                name={`${namePrefix}Ast_${idx}_${astIdx}`}
                                value={ar.astValue}
                                options={AST_VALUE_OPTIONS}
                                onChange={(e) => {
                                  if (ar.astAntibioticId !== null) {
                                    callbacks.updateAstValue(idx, ar.astAntibioticId, 'astValue', e.target.value)
                                  }
                                }}
                              />
                            </td>
                            <td className={`px-1 py-1 border ${config.tableBorder}`}>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={ar.micValue}
                                  onChange={(e) => {
                                    if (ar.astAntibioticId !== null) {
                                      callbacks.updateAstValue(idx, ar.astAntibioticId, 'micValue', e.target.value)
                                    }
                                  }}
                                  className={`w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm ${config.micFocus} outline-none`}
                                  placeholder="MIC"
                                />
                                <span className="text-xs text-gray-500 whitespace-nowrap">μg/mL</span>
                              </div>
                            </td>
                            <td className={`px-1 py-1 border ${config.tableBorder} text-center`}>
                              <button
                                type="button"
                                onClick={() => callbacks.removeAstResult(idx, astIdx)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Remove antibiotic"
                              >
                                <i className="fa-solid fa-xmark text-sm"></i>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {usedAntibioticIds.length < astAntibioticsOptions.length && (
                <button
                  type="button"
                  onClick={() => callbacks.addAstResult(idx)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${config.addBtnBg} ${config.addBtnText} ${config.addBtnHover} ${bp.astResults.length > 0 ? 'mt-2' : 'mt-1'}`}
                >
                  <i className="fa-solid fa-plus"></i>
                  Add antibiotic
                </button>
              )}
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={callbacks.add}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${config.addBtnBg} ${config.addBtnText} ${config.addBtnHover} w-auto ${entries.length > 0 ? 'mt-4' : ''}`}
      >
        <i className="fa-solid fa-plus"></i>
        Add {config.label.toLowerCase()}
      </button>
    </div>
  )

  const BSI_CONFIG = {
    title: 'BSI Causative pathogen',
    label: 'BSI pathogen',
    borderDashed: 'border-amber-300',
    titleColor: 'text-amber-700',
    cardBorder: 'border-amber-200',
    headerColor: 'text-amber-800',
    pillSelected: 'bg-amber-600 text-white border-amber-600',
    pillHover: 'hover:border-amber-400 hover:text-amber-700',
    tableHeaderBg: 'bg-amber-50',
    tableHeaderText: 'text-amber-800',
    tableBorder: 'border-amber-200',
    tableRowHover: 'hover:bg-amber-50/50',
    micFocus: 'focus:border-amber-500 focus:ring-1 focus:ring-amber-500',
    addBtnBg: 'bg-amber-50',
    addBtnText: 'text-amber-600',
    addBtnHover: 'hover:bg-amber-100',
  }

  const IC_CONFIG = {
    title: 'Infectious complication',
    label: 'Infectious complication',
    borderDashed: 'border-orange-300',
    titleColor: 'text-orange-700',
    cardBorder: 'border-orange-200',
    headerColor: 'text-orange-800',
    pillSelected: 'bg-orange-600 text-white border-orange-600',
    pillHover: 'hover:border-orange-400 hover:text-orange-700',
    tableHeaderBg: 'bg-orange-50',
    tableHeaderText: 'text-orange-800',
    tableBorder: 'border-orange-200',
    tableRowHover: 'hover:bg-orange-50/50',
    micFocus: 'focus:border-orange-500 focus:ring-1 focus:ring-orange-500',
    addBtnBg: 'bg-orange-50',
    addBtnText: 'text-orange-600',
    addBtnHover: 'hover:bg-orange-100',
  }

  return (
    <div>
      <PageHeader
        icon="fa-solid fa-hospital-user"
        title={isEdit ? 'Edit Patient' : 'New Patient'}
        subtitle={isEdit ? 'Edit patient data' : 'Enter new patient data'}
        backButton={{ route: '/admin/patients' }}
        buttons={[
          {
            label: saving ? 'Saving...' : 'Save',
            icon: 'fa-solid fa-floppy-disk',
            onClick: handleSubmit(onSubmit),
            variant: 'primary',
            disabled: saving,
            loading: saving,
          },
        ]}
      />
      <div className="container mx-auto p-6">
        <FormErrors errors={errors} />

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Demographic Data */}
          <FormSection title="Demographic Data" colorScheme="green">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Name *"
                type="text"
                {...register('name')}
                error={errors.name ? { message: errors.name.message ?? '' } : undefined}
              />
              <Input
                label="ID"
                type="text"
                {...register('internalId')}
              />
              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="Date of birth"
                    value={field.value}
                    onChange={(date) => field.onChange(date)}
                    error={errors.dateOfBirth ? { message: errors.dateOfBirth.message ?? '' } : undefined}
                  />
                )}
              />
              <Controller
                name="sex"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Sex"
                    name="sex"
                    value={field.value}
                    options={SEX_OPTIONS}
                    onChange={(e) => field.onChange(e.target.value)}
                    error={errors.sex ? { message: errors.sex.message ?? '' } : undefined}
                  />
                )}
              />
            </div>
          </FormSection>

          {/* Clinical Data */}
          <FormSection title="Clinical Data" colorScheme="cyan">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Controller
                name="wardOfAdmissionId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Ward of admission"
                    name="wardOfAdmissionId"
                    value={field.value}
                    options={wardOptions}
                    onChange={(e) => field.onChange(e.target.value)}
                    error={errors.wardOfAdmissionId ? { message: errors.wardOfAdmissionId.message ?? '' } : undefined}
                  />
                )}
              />
              <Controller
                name="bsiOnset"
                control={control}
                render={({ field }) => (
                  <Select
                    label="BSI onset (Community/Hospital-acquired)"
                    name="bsiOnset"
                    value={field.value}
                    options={BSI_ONSET_OPTIONS}
                    onChange={(e) => field.onChange(e.target.value)}
                    error={errors.bsiOnset ? { message: errors.bsiOnset.message ?? '' } : undefined}
                  />
                )}
              />
              <Controller
                name="bsiDiagnosisDate"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="BSI diagnosis date (1st blood culture +)"
                    value={field.value}
                    onChange={(date) => field.onChange(date)}
                    error={errors.bsiDiagnosisDate ? { message: errors.bsiDiagnosisDate.message ?? '' } : undefined}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              <Controller
                name="admissionDate"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="Admission date"
                    value={field.value}
                    onChange={(date) => field.onChange(date)}
                    error={errors.admissionDate ? { message: errors.admissionDate.message ?? '' } : undefined}
                  />
                )}
              />
              <Controller
                name="dischargeDate"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="Discharge date"
                    value={field.value}
                    onChange={(date) => field.onChange(date)}
                    error={errors.dischargeDate ? { message: errors.dischargeDate.message ?? '' } : undefined}
                  />
                )}
              />
              <Input
                label="LOS (days)"
                type="number"
                {...register('los')}
                error={errors.los ? { message: errors.los.message ?? '' } : undefined}
                disabled
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              <Input
                label="SOFA score"
                type="number"
                {...register('sofaScore')}
                error={errors.sofaScore ? { message: errors.sofaScore.message ?? '' } : undefined}
              />
              <Input
                label="Charlson Comorbidity Index"
                type="number"
                {...register('charlsonComorbidityIndex')}
                error={errors.charlsonComorbidityIndex ? { message: errors.charlsonComorbidityIndex.message ?? '' } : undefined}
              />
            </div>
          </FormSection>

          {/* Microbiological Data */}
          <FormSection title="Microbiological Data" colorScheme="amber">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Controller
                name="rectalColonizationStatus"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Rectal colonization status"
                    name="rectalColonizationStatus"
                    value={field.value}
                    options={RECTAL_COLONIZATION_OPTIONS}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="rectalColonizationPathogenId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Rectal colonization pathogen"
                    name="rectalColonizationPathogenId"
                    value={field.value}
                    options={rectalPathogenSelectOptions}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </div>

            {/* BSI Causative pathogen sub-group */}
            {renderPathogenGroup(
              bsiPathogens,
              BSI_CONFIG,
              {
                updatePathogenId: updateBsiPathogenId,
                updateSiteOfIsolation: updateBsiSiteOfIsolation,
                toggleResistanceProfile: toggleBsiResistanceProfile,
                updateAstValue: updateBsiAstValue,
                updateAstAntibioticId: updateBsiAstAntibioticId,
                addAstResult: addBsiAstResult,
                removeAstResult: removeBsiAstResult,
                remove: removeBsiPathogen,
                add: addBsiPathogen,
              },
              'bsi',
            )}

            {/* Infectious complication sub-group */}
            {renderPathogenGroup(
              infectiousComplications,
              IC_CONFIG,
              {
                updatePathogenId: updateIcPathogenId,
                updateSiteOfIsolation: updateIcSiteOfIsolation,
                toggleResistanceProfile: toggleIcResistanceProfile,
                updateAstValue: updateIcAstValue,
                updateAstAntibioticId: updateIcAstAntibioticId,
                addAstResult: addIcAstResult,
                removeAstResult: removeIcAstResult,
                remove: removeIcPathogen,
                add: addIcPathogen,
              },
              'ic',
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              <Controller
                name="monoPoliMicrobial"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Mono- or poli-microbial infection"
                    name="monoPoliMicrobial"
                    value={field.value}
                    options={MONO_POLI_OPTIONS}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </div>
          </FormSection>

          {/* Therapeutic Data */}
          <FormSection title="Therapeutic Data" colorScheme="fuchsia">
            {/* Empirical antimicrobial therapy sub-group */}
            <div className="border-2 border-dashed border-fuchsia-300 rounded-lg p-4">
              <h3 className="text-base font-semibold text-fuchsia-700 mb-4">Empirical antimicrobial therapy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {empiricalTherapies.map((therapy, index) => (
                  <div key={index} className="flex items-end gap-3">
                    <div className="flex-1">
                      <Select
                        label={`${ordinal(index + 1)} therapy`}
                        name={`empiricalTherapy_${index}`}
                        value={therapy.antimicrobialTherapyId}
                        options={therapySelectOptions}
                        onChange={(e) => updateEmpiricalTherapy(index, e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEmpiricalTherapy(index)}
                      className="mb-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove therapy"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEmpiricalTherapy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100 w-auto"
                >
                  <i className="fa-solid fa-plus"></i>
                  Add therapy
                </button>
              </div>
            </div>

            {/* Targeted therapy sub-group */}
            <div className="mt-6 border-2 border-dashed border-fuchsia-300 rounded-lg p-4">
              <h3 className="text-base font-semibold text-fuchsia-700 mb-4">Targeted therapy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {targetedTherapies.map((therapy, index) => (
                  <div key={index} className="flex items-end gap-3">
                    <div className="flex-1">
                      <Select
                        label={`${ordinal(index + 1)} therapy`}
                        name={`targetedTherapy_${index}`}
                        value={therapy.antimicrobialTherapyId}
                        options={therapySelectOptions}
                        onChange={(e) => updateTargetedTherapy(index, e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTargetedTherapy(index)}
                      className="mb-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove therapy"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTargetedTherapy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100 w-auto"
                >
                  <i className="fa-solid fa-plus"></i>
                  Add therapy
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              <Controller
                name="combinationTherapy"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Combination therapy"
                    name="combinationTherapy"
                    value={field.value}
                    options={COMBINATION_THERAPY_OPTIONS}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="dateTargetedTherapy"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="Date targeted therapy"
                    value={field.value}
                    onChange={(date) => field.onChange(date)}
                  />
                )}
              />
              <Input
                label="Time to appropriate therapy (days)"
                type="number"
                {...register('timeToAppropriateTherapy')}
                readOnly
                disabled
                error={errors.timeToAppropriateTherapy ? { message: errors.timeToAppropriateTherapy.message ?? '' } : undefined}
              />
            </div>
          </FormSection>

          {/* Outcome */}
          <FormSection title="Outcome" colorScheme="lime">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Controller
                name="outcome"
                control={control}
                render={({ field }) => (
                  <Select
                    label="30-day mortality"
                    name="outcome"
                    value={field.value}
                    options={OUTCOME_OPTIONS}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </div>
          </FormSection>
        </form>
      </div>
    </div>
  )
}

export default PatientDetail

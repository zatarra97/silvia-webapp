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

interface BsiPathogenEntry {
  bsiPathogenId: number | string | null
  resistanceProfileIds: number[]
  astResults: { astAntibioticId: number; astValue: number | string | null; micValue: string }[]
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
  const [isolationSites, setIsolationSites] = useState<{ siteOfIsolationId: string | number | null }[]>([])
  const [empiricalTherapies, setEmpiricalTherapies] = useState<{ antimicrobialTherapyId: string | number | null }[]>([])
  const [targetedTherapies, setTargetedTherapies] = useState<{ antimicrobialTherapyId: string | number | null }[]>([])
  const [bsiPathogens, setBsiPathogens] = useState<BsiPathogenEntry[]>([])

  const {
    register,
    handleSubmit,
    control,
    reset,
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

  useEffect(() => {
    if (!isEdit) return
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
        if (data.isolationSites && data.isolationSites.length > 0) {
          setIsolationSites(
            data.isolationSites.map((is: any) => ({
              siteOfIsolationId: is.siteOfIsolationId ?? null,
            }))
          )
        }
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
          setBsiPathogens(
            data.bsiPathogens.map((bp: any) => ({
              bsiPathogenId: bp.bsiPathogenId ?? null,
              resistanceProfileIds: bp.resistanceProfiles
                ? bp.resistanceProfiles.map((rp: any) => rp.resistanceProfileId)
                : [],
              astResults: bp.astResults
                ? bp.astResults.map((ar: any) => ({
                    astAntibioticId: ar.astAntibioticId,
                    astValue: ar.astValue ?? null,
                    micValue: ar.micValue || '',
                  }))
                : [],
            }))
          )
        }
      } catch (e) {
        toast.error('Errore nel caricamento del paziente')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchPatient()
  }, [id, isEdit, reset])

  const toNum = (v: any) => (v !== null && v !== '' && v !== undefined ? Number(v) : null)

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
        sofaScore: toNum(formData.sofaScore),
        charlsonComorbidityIndex: toNum(formData.charlsonComorbidityIndex),
        rectalColonizationStatus: toNum(formData.rectalColonizationStatus),
        rectalColonizationPathogenId: toNum(formData.rectalColonizationPathogenId),
        monoPoliMicrobial: toNum(formData.monoPoliMicrobial),
        combinationTherapy: toNum(formData.combinationTherapy),
        dateTargetedTherapy: formData.dateTargetedTherapy || null,
        timeToAppropriateTherapy: toNum(formData.timeToAppropriateTherapy),
        outcome: toNum(formData.outcome),
        isolationSites: isolationSites
          .filter((is) => is.siteOfIsolationId !== null && is.siteOfIsolationId !== '')
          .map((is, idx) => ({ siteOfIsolationId: Number(is.siteOfIsolationId), pathogenOrder: idx + 1 })),
        empiricalTherapies: empiricalTherapies
          .filter((t) => t.antimicrobialTherapyId !== null && t.antimicrobialTherapyId !== '')
          .map((t, idx) => ({ antimicrobialTherapyId: Number(t.antimicrobialTherapyId), therapyOrder: idx + 1 })),
        targetedTherapies: targetedTherapies
          .filter((t) => t.antimicrobialTherapyId !== null && t.antimicrobialTherapyId !== '')
          .map((t, idx) => ({ antimicrobialTherapyId: Number(t.antimicrobialTherapyId), therapyOrder: idx + 1 })),
        bsiPathogens: bsiPathogens
          .filter((bp) => bp.bsiPathogenId !== null && bp.bsiPathogenId !== '')
          .map((bp, idx) => ({
            bsiPathogenId: Number(bp.bsiPathogenId),
            pathogenOrder: idx + 1,
            resistanceProfiles: bp.resistanceProfileIds.map((rpId) => ({
              resistanceProfileId: rpId,
            })),
            astResults: bp.astResults
              .filter((ar) => ar.astValue !== null && ar.astValue !== '')
              .map((ar) => ({
                astAntibioticId: ar.astAntibioticId,
                astValue: Number(ar.astValue),
                micValue: ar.micValue || null,
              })),
          })),
      }

      if (isEdit) {
        await updateItem(ENTITIES.PATIENTS, id!, payload)
        toast.success('Paziente aggiornato con successo')
      } else {
        await createItem(ENTITIES.PATIENTS, payload)
        toast.success('Paziente creato con successo')
      }
      navigate('/admin/patients')
    } catch (e) {
      toast.error('Errore durante il salvataggio')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Isolation sites helpers
  const addIsolationSite = () => {
    setIsolationSites((prev) => [...prev, { siteOfIsolationId: null }])
  }
  const removeIsolationSite = (index: number) => {
    setIsolationSites((prev) => prev.filter((_, i) => i !== index))
  }
  const updateIsolationSite = (index: number, value: string | number | null) => {
    setIsolationSites((prev) =>
      prev.map((item, i) => (i === index ? { siteOfIsolationId: value } : item))
    )
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

  // BSI Pathogens helpers
  const createEmptyBsiPathogen = (): BsiPathogenEntry => ({
    bsiPathogenId: null,
    resistanceProfileIds: [],
    astResults: astAntibioticsOptions.map((ab) => ({
      astAntibioticId: ab.id,
      astValue: null,
      micValue: '',
    })),
  })

  const addBsiPathogen = () => {
    setBsiPathogens((prev) => [...prev, createEmptyBsiPathogen()])
  }
  const removeBsiPathogen = (index: number) => {
    setBsiPathogens((prev) => prev.filter((_, i) => i !== index))
  }
  const updateBsiPathogenId = (index: number, value: string | number | null) => {
    setBsiPathogens((prev) =>
      prev.map((item, i) => (i === index ? { ...item, bsiPathogenId: value } : item))
    )
  }
  const toggleResistanceProfile = (bsiIndex: number, rpId: number) => {
    setBsiPathogens((prev) =>
      prev.map((item, i) => {
        if (i !== bsiIndex) return item
        const ids = item.resistanceProfileIds.includes(rpId)
          ? item.resistanceProfileIds.filter((id) => id !== rpId)
          : [...item.resistanceProfileIds, rpId]
        return { ...item, resistanceProfileIds: ids }
      })
    )
  }
  const updateAstValue = (bsiIndex: number, antibioticId: number, field: 'astValue' | 'micValue', value: any) => {
    setBsiPathogens((prev) =>
      prev.map((item, i) => {
        if (i !== bsiIndex) return item
        const astResults = item.astResults.map((ar) =>
          ar.astAntibioticId === antibioticId ? { ...ar, [field]: value } : ar
        )
        return { ...item, astResults }
      })
    )
  }

  const wardOptions = wards.map((w) => ({ value: w.id, label: w.name }))
  const siteSelectOptions = sitesOptions.map((s) => ({ value: s.id, label: s.name }))
  const therapySelectOptions = therapiesOptions.map((t) => ({ value: t.id, label: t.name }))
  const bsiPathogenSelectOptions = bsiPathogensOptions.map((p) => ({ value: p.id, label: p.name }))
  const rectalPathogenSelectOptions = bsiPathogensOptions.map((p) => ({ value: p.id, label: p.name }))

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

            {/* Site of isolation sub-group */}
            <div className="mt-6 border-2 border-dashed border-cyan-300 rounded-lg p-4">
              <h3 className="text-base font-semibold text-cyan-700 mb-4">Site of isolation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isolationSites.map((site, index) => (
                  <div key={index} className="flex items-end gap-3">
                    <div className="flex-1">
                      <Select
                        label={`${ordinal(index + 1)} pathogen`}
                        name={`isolationSite_${index}`}
                        value={site.siteOfIsolationId}
                        options={siteSelectOptions}
                        onChange={(e) => updateIsolationSite(index, e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeIsolationSite(index)}
                      className="mb-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove site"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIsolationSite}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer bg-cyan-50 text-cyan-600 hover:bg-cyan-100 w-auto"
                >
                  <i className="fa-solid fa-plus"></i>
                  Add site
                </button>
              </div>
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
            <div className="mt-6 border-2 border-dashed border-amber-300 rounded-lg p-4">
              <h3 className="text-base font-semibold text-amber-700 mb-4">BSI Causative pathogen</h3>

              {bsiPathogens.map((bp, bsiIndex) => (
                <div key={bsiIndex} className={`border border-amber-200 rounded-lg p-4 bg-white ${bsiIndex > 0 ? 'mt-4' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-amber-800">{ordinal(bsiIndex + 1)} BSI pathogen</h4>
                    <button
                      type="button"
                      onClick={() => removeBsiPathogen(bsiIndex)}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-sm"
                      title="Remove pathogen"
                    >
                      <i className="fa-solid fa-trash mr-1"></i>
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Pathogen"
                      name={`bsiPathogen_${bsiIndex}`}
                      value={bp.bsiPathogenId}
                      options={bsiPathogenSelectOptions}
                      onChange={(e) => updateBsiPathogenId(bsiIndex, e.target.value)}
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
                          onClick={() => toggleResistanceProfile(bsiIndex, rp.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                            bp.resistanceProfileIds.includes(rp.id)
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400 hover:text-amber-700'
                          }`}
                        >
                          {rp.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AST / MIC grid */}
                  <div className="mt-4">
                    <label className="form-label">AST / MIC results</label>
                    <div className="mt-1 overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-amber-50">
                            <th className="text-left px-3 py-2 font-medium text-amber-800 border border-amber-200">Antibiotic</th>
                            <th className="text-left px-3 py-2 font-medium text-amber-800 border border-amber-200 w-64">AST</th>
                            <th className="text-left px-3 py-2 font-medium text-amber-800 border border-amber-200 w-32">MIC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bp.astResults.map((ar) => {
                            const antibiotic = astAntibioticsOptions.find((a) => a.id === ar.astAntibioticId)
                            return (
                              <tr key={ar.astAntibioticId} className="hover:bg-amber-50/50">
                                <td className="px-3 py-1.5 border border-amber-200 text-gray-700 font-medium">
                                  {antibiotic?.name || `ID ${ar.astAntibioticId}`}
                                </td>
                                <td className="px-1 py-1 border border-amber-200">
                                  <Select
                                    name={`ast_${bsiIndex}_${ar.astAntibioticId}`}
                                    value={ar.astValue}
                                    options={AST_VALUE_OPTIONS}
                                    onChange={(e) => updateAstValue(bsiIndex, ar.astAntibioticId, 'astValue', e.target.value)}
                                  />
                                </td>
                                <td className="px-1 py-1 border border-amber-200">
                                  <input
                                    type="text"
                                    value={ar.micValue}
                                    onChange={(e) => updateAstValue(bsiIndex, ar.astAntibioticId, 'micValue', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                                    placeholder="MIC"
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addBsiPathogen}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer bg-amber-50 text-amber-600 hover:bg-amber-100 w-auto ${bsiPathogens.length > 0 ? 'mt-4' : ''}`}
              >
                <i className="fa-solid fa-plus"></i>
                Add BSI pathogen
              </button>
            </div>

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

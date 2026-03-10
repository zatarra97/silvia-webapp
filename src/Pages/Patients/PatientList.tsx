import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import moment from 'moment'
import PageHeader from '../../Components/PageHeader'
import Table from '../../Components/Table'
import Filters from '../../Components/Filters'
import Pagination from '../../Components/Pagination'
import DeleteModal from '../../Components/DeleteModal'
import { getList, getCountWhere, deleteItem } from '../../services/api-utility'
import { ENTITIES } from '../../constants'
import { exportPatientsToExcel } from '../../services/excel-export'

const SEX_OPTIONS = [
  { value: '0', label: 'Femmina' },
  { value: '1', label: 'Maschio' },
]

const BSI_ONSET_OPTIONS = [
  { value: '0', label: 'Community-acquired' },
  { value: '1', label: 'Hospital-acquired' },
]

const PatientList = () => {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [wards, setWards] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: any | null; isLoading: boolean }>({
    isOpen: false,
    item: null,
    isLoading: false,
  })

  // Fetch wards and sites for name resolution
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [wardData, siteData] = await Promise.all([
          getList(ENTITIES.WARDS_OF_ADMISSION, {}, { limit: 1000 }, 'id ASC'),
          getList(ENTITIES.SITES_OF_ISOLATION, {}, { limit: 1000 }, 'id ASC'),
        ])
        setWards(wardData)
        setSites(siteData)
      } catch (e) {
        console.error(e)
      }
    }
    fetchLookups()
  }, [])

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const [allPatients, wardData, siteData, therapyData, bsiPathogenData, rpData, astData] = await Promise.all([
        getList(ENTITIES.PATIENTS, {}, { limit: 100000 }, 'id ASC'),
        getList(ENTITIES.WARDS_OF_ADMISSION, {}, { limit: 1000 }, 'id ASC'),
        getList(ENTITIES.SITES_OF_ISOLATION, {}, { limit: 1000 }, 'id ASC'),
        getList(ENTITIES.ANTIMICROBIAL_THERAPIES, {}, { limit: 1000 }, 'id ASC'),
        getList(ENTITIES.BSI_PATHOGENS, {}, { limit: 1000 }, 'id ASC'),
        getList(ENTITIES.RESISTANCE_PROFILES, {}, { limit: 1000 }, 'id ASC'),
        getList(ENTITIES.AST_ANTIBIOTICS, {}, { limit: 1000 }, 'id ASC'),
      ])
      await exportPatientsToExcel(allPatients, {
        wards: wardData,
        sites: siteData,
        therapies: therapyData,
        bsiPathogens: bsiPathogenData,
        resistanceProfiles: rpData,
        astAntibiotics: astData,
      })
      toast.success('Export completato')
    } catch (e) {
      console.error(e)
      toast.error('Errore durante l\'export')
    } finally {
      setExporting(false)
    }
  }

  const buildWhere = useCallback((f: Record<string, string>) => {
    const where: Record<string, any> = {}
    Object.entries(f).forEach(([key, value]) => {
      if (!value) return
      if (key === 'name') {
        where[key] = { like: `%${value}%`, options: 'i' }
      } else if (key.includes('Id')) {
        where[key] = value
      } else {
        where[key] = value
      }
    })
    return where
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [data, count] = await Promise.all([
        getList(ENTITIES.PATIENTS, filters, { limit: itemsPerPage, skip: (currentPage - 1) * itemsPerPage }, 'id ASC'),
        getCountWhere(ENTITIES.PATIENTS, buildWhere(filters)),
      ])
      setPatients(data)
      setTotalCount(count)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters, currentPage, itemsPerPage, buildWhere])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }))
    setCurrentPage(1)
  }

  const handleDelete = async () => {
    if (!deleteModal.item) return
    setDeleteModal((prev) => ({ ...prev, isLoading: true }))
    try {
      await deleteItem(ENTITIES.PATIENTS, deleteModal.item.id)
      toast.success('Paziente eliminato con successo')
      setDeleteModal({ isOpen: false, item: null, isLoading: false })
      fetchData()
    } catch (e) {
      toast.error('Errore durante l\'eliminazione')
      setDeleteModal((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const getWardName = (wardId: number | string | null) => {
    if (!wardId) return '-'
    const ward = wards.find((w) => String(w.id) === String(wardId))
    return ward ? ward.name : '-'
  }

  const getSiteNames = (isolationSites: any[] | undefined) => {
    if (!isolationSites || isolationSites.length === 0) return '-'
    return isolationSites
      .map((is: any) => {
        const site = sites.find((s) => String(s.id) === String(is.siteOfIsolationId))
        return site ? site.name : '?'
      })
      .join(', ')
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return moment(dateStr).format('DD/MM/YYYY')
  }

  const wardFilterOptions = wards.map((w) => ({ value: String(w.id), label: w.name }))

  const filterConfig = [
    { label: 'Nome', name: 'name', type: 'text' as const, options: [] },
    { label: 'Reparto', name: 'wardOfAdmissionId', type: 'select' as const, options: wardFilterOptions },
    { label: 'Sesso', name: 'sex', type: 'select' as const, options: SEX_OPTIONS },
    { label: 'BSI Onset', name: 'bsiOnset', type: 'select' as const, options: BSI_ONSET_OPTIONS },
  ]

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'internalId', header: 'ID Interno' },
    {
      key: 'dateOfBirth',
      header: 'Data di Nascita',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'sex',
      header: 'Sesso',
      render: (value: number | null) => {
        if (value === 0) return 'Femmina'
        if (value === 1) return 'Maschio'
        return '-'
      },
    },
    {
      key: 'wardOfAdmissionId',
      header: 'Reparto',
      render: (value: number) => getWardName(value),
    },
    {
      key: 'bsiOnset',
      header: 'BSI Onset',
      render: (value: number | null) => {
        if (value === 0) return 'Community-acquired'
        if (value === 1) return 'Hospital-acquired'
        return '-'
      },
    },
    {
      key: 'bsiDiagnosisDate',
      header: 'Data Diagnosi BSI',
      render: (value: string) => formatDate(value),
    },
    { key: 'sofaScore', header: 'SOFA Score' },
    { key: 'charlsonComorbidityIndex', header: 'Charlson Index' },
    {
      key: 'isolationSites',
      header: 'Siti di Isolamento',
      render: (_value: any, item: any) => getSiteNames(item.isolationSites),
    },
  ]

  const actions = [
    {
      icon: 'fa-pen',
      method: (item: any) => navigate(`/admin/patients/${item.id}`),
      tooltip: 'Modifica',
    },
    {
      icon: 'fa-trash',
      method: (item: any) => setDeleteModal({ isOpen: true, item, isLoading: false }),
      tooltip: 'Elimina',
    },
  ]

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage))

  return (
    <div>
      <PageHeader
        icon="fa-solid fa-hospital-user"
        title="Pazienti"
        subtitle={`${totalCount} pazienti totali`}
        buttons={[
          {
            label: 'Export Excel',
            icon: 'fa-solid fa-file-excel',
            onClick: handleExportExcel,
            variant: 'csv' as const,
            disabled: exporting,
            loading: exporting,
          },
          {
            label: 'Nuovo Paziente',
            icon: 'fa-solid fa-plus',
            onClick: () => navigate('/admin/patients/new'),
            variant: 'primary',
          },
        ]}
      />
      <div className="container mx-auto p-6">
        <Filters
          filters={filterConfig}
          onFilterChange={handleFilterChange}
          entity={ENTITIES.PATIENTS}
          values={filters}
        />
        <Table columns={columns} data={patients} actions={actions} loading={loading} />
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val)
              setCurrentPage(1)
            }}
          />
        )}
      </div>
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null, isLoading: false })}
        onConfirm={handleDelete}
        title="Elimina paziente"
        description={`Sei sicuro di voler eliminare il paziente "${deleteModal.item?.name || ''}"? Questa azione è irreversibile.`}
        isLoading={deleteModal.isLoading}
      />
    </div>
  )
}

export default PatientList

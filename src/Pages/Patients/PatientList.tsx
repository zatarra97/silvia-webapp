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
  { value: '0', label: 'Female' },
  { value: '1', label: 'Male' },
]

const OUTCOME_OPTIONS = [
  { value: '1', label: 'Survivor' },
  { value: '0', label: 'Non-survivor' },
]

const PatientList = () => {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [exporting, setExporting] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: any | null; isLoading: boolean }>({
    isOpen: false,
    item: null,
    isLoading: false,
  })

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
      toast.success('Export completed')
    } catch (e) {
      console.error(e)
      toast.error('Error during export')
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
      toast.success('Patient deleted successfully')
      setDeleteModal({ isOpen: false, item: null, isLoading: false })
      fetchData()
    } catch (e) {
      toast.error('Error during deletion')
      setDeleteModal((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return moment(dateStr).format('DD/MM/YYYY')
  }

  const filterConfig = [
    { label: 'Name', name: 'name', type: 'text' as const, options: [] },
    { label: 'Sex', name: 'sex', type: 'select' as const, options: SEX_OPTIONS },
    { label: 'Outcome', name: 'outcome', type: 'select' as const, options: OUTCOME_OPTIONS },
  ]

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'internalId', header: 'Internal ID' },
    {
      key: 'dateOfBirth',
      header: 'Date of Birth',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'sex',
      header: 'Sex',
      render: (value: number | null) => {
        if (value === 0) return 'Female'
        if (value === 1) return 'Male'
        return '-'
      },
    },
    {
      key: 'admissionDate',
      header: 'Admission Date',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'bsiDiagnosisDate',
      header: 'BSI Diagnosis Date',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'los',
      header: 'LOS',
      render: (value: number | null) => (value != null ? `${value}` : '-'),
    },
    {
      key: 'outcome',
      header: 'Outcome',
      render: (value: number | null) => {
        if (value === 1) {
          return (
            <span title="Survivor">
              <i className="fa-solid fa-heart text-red-500 text-lg"></i>
            </span>
          )
        }
        if (value === 0) {
          return (
            <span title="Non-survivor">
              <i className="fa-solid fa-heart-crack text-gray-400 text-lg"></i>
            </span>
          )
        }
        return '-'
      },
    },
  ]

  const actions = [
    {
      icon: 'fa-pen',
      method: (item: any) => navigate(`/admin/patients/${item.id}`),
      tooltip: 'Edit',
    },
    {
      icon: 'fa-trash',
      method: (item: any) => setDeleteModal({ isOpen: true, item, isLoading: false }),
      tooltip: 'Delete',
    },
  ]

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage))

  return (
    <div>
      <PageHeader
        icon="fa-solid fa-hospital-user"
        title="Patients"
        subtitle={`${totalCount} total patients`}
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
            label: 'New Patient',
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
        <Table columns={columns} data={patients} actions={actions} loading={loading} sortable />
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
        title="Delete patient"
        description={`Are you sure you want to delete the patient "${deleteModal.item?.name || ''}"? This action is irreversible.`}
        isLoading={deleteModal.isLoading}
      />
    </div>
  )
}

export default PatientList

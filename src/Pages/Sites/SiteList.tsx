import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import moment from 'moment'
import PageHeader from '../../Components/PageHeader'
import Table from '../../Components/Table'
import Pagination from '../../Components/Pagination'
import DeleteModal from '../../Components/DeleteModal'
import Input from '../../Components/Input'
import { getList, getCountWhere, deleteItem, createItem, updateItem } from '../../services/api-utility'
import { ENTITIES } from '../../constants'

interface FormModalProps {
  isOpen: boolean
  item: any | null
  onClose: () => void
  onSave: (name: string) => Promise<void>
  saving: boolean
}

const FormModal = ({ isOpen, item, onClose, onSave, saving }: FormModalProps) => {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(item?.name || '')
      setError('')
    }
  }, [isOpen, item])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Il nome è obbligatorio')
      return
    }
    await onSave(name.trim())
  }

  return (
    <div className="relative z-50" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl ring-1 ring-gray-100 transition-all sm:my-8 sm:w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="absolute right-3 top-3">
              <button
                type="button"
                aria-label="Chiudi"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 focus:outline-none cursor-pointer"
                onClick={onClose}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="bg-white px-6 pb-6 pt-7 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 ring-4 ring-violet-50">
                  <i className="fa-solid fa-vials text-lg"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold leading-7 text-gray-900">
                    {item ? 'Modifica Sito di Isolamento' : 'Nuovo Sito di Isolamento'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {item ? 'Modifica il nome del sito' : 'Inserisci il nome del nuovo sito'}
                  </p>
                </div>
              </div>
              <Input
                label="Nome *"
                type="text"
                name="siteName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError('')
                }}
                error={error ? { message: error } : undefined}
              />
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="inline-flex min-w-24 justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 cursor-pointer"
                  onClick={onClose}
                  disabled={saving}
                >
                  Annulla
                </button>
                <button
                  type="button"
                  className={`inline-flex min-w-28 justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm cursor-pointer ${
                    saving ? 'bg-violet-400 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500'
                  }`}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-floppy-disk mr-2"></i>
                      Salva
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const SiteList = () => {
  const [sites, setSites] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [saving, setSaving] = useState(false)
  const [formModal, setFormModal] = useState<{ isOpen: boolean; item: any | null }>({ isOpen: false, item: null })
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: any | null; isLoading: boolean }>({
    isOpen: false,
    item: null,
    isLoading: false,
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [data, count] = await Promise.all([
        getList(ENTITIES.SITES_OF_ISOLATION, {}, { limit: itemsPerPage, skip: (currentPage - 1) * itemsPerPage }, 'name ASC'),
        getCountWhere(ENTITIES.SITES_OF_ISOLATION, {}),
      ])
      setSites(data)
      setTotalCount(count)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async (name: string) => {
    setSaving(true)
    try {
      if (formModal.item) {
        await updateItem(ENTITIES.SITES_OF_ISOLATION, formModal.item.id, { name })
        toast.success('Sito aggiornato con successo')
      } else {
        await createItem(ENTITIES.SITES_OF_ISOLATION, { name })
        toast.success('Sito creato con successo')
      }
      setFormModal({ isOpen: false, item: null })
      fetchData()
    } catch (e) {
      toast.error('Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.item) return
    setDeleteModal((prev) => ({ ...prev, isLoading: true }))
    try {
      await deleteItem(ENTITIES.SITES_OF_ISOLATION, deleteModal.item.id)
      toast.success('Sito di isolamento eliminato con successo')
      setDeleteModal({ isOpen: false, item: null, isLoading: false })
      fetchData()
    } catch (e) {
      toast.error('Errore durante l\'eliminazione')
      setDeleteModal((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Nome' },
    {
      key: 'createdAt',
      header: 'Data Creazione',
      render: (value: string) => (value ? moment(value).format('DD/MM/YYYY HH:mm') : '-'),
    },
  ]

  const actions = [
    {
      icon: 'fa-pen',
      method: (item: any) => setFormModal({ isOpen: true, item }),
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
        icon="fa-solid fa-vials"
        title="Siti di Isolamento"
        subtitle={`${totalCount} siti totali`}
        buttons={[
          {
            label: 'Nuovo Sito',
            icon: 'fa-solid fa-plus',
            onClick: () => setFormModal({ isOpen: true, item: null }),
            variant: 'primary',
          },
        ]}
      />
      <div className="container mx-auto p-6">
        <Table columns={columns} data={sites} actions={actions} loading={loading} />
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
      <FormModal
        isOpen={formModal.isOpen}
        item={formModal.item}
        onClose={() => setFormModal({ isOpen: false, item: null })}
        onSave={handleSave}
        saving={saving}
      />
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null, isLoading: false })}
        onConfirm={handleDelete}
        title="Elimina sito di isolamento"
        description={`Sei sicuro di voler eliminare il sito "${deleteModal.item?.name || ''}"? Questa azione è irreversibile.`}
        isLoading={deleteModal.isLoading}
      />
    </div>
  )
}

export default SiteList

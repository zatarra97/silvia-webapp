import { useEffect, useState } from 'react'
import { getCount } from '../../services/api-utility'
import PageHeader from '../../Components/PageHeader'
import { ENTITIES } from '../../constants'

const AdminDashboard = () => {
  const [stats, setStats] = useState({ patients: 0, wards: 0, sites: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [patients, wards, sites] = await Promise.all([
          getCount(ENTITIES.PATIENTS),
          getCount(ENTITIES.WARDS_OF_ADMISSION),
          getCount(ENTITIES.SITES_OF_ISOLATION),
        ])
        setStats({ patients, wards, sites })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Pazienti', value: stats.patients, icon: 'fa-solid fa-hospital-user', color: 'blue' },
    { label: 'Reparti', value: stats.wards, icon: 'fa-solid fa-bed', color: 'emerald' },
    { label: 'Siti di isolamento', value: stats.sites, icon: 'fa-solid fa-vials', color: 'violet' },
  ]

  return (
    <div>
      <PageHeader icon="fa-solid fa-gauge" title="Dashboard" subtitle="Panoramica del sistema" />
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-${card.color}-100`}>
                  <i className={`${card.icon} text-${card.color}-600 text-xl`}></i>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {loading ? <i className="fa-solid fa-spinner fa-spin text-gray-400"></i> : card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard

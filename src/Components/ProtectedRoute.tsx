import React from 'react'
import { Navigate } from 'react-router-dom'
import { LOCAL_STORAGE_KEYS, DEFAULT_ROUTE, DEFAULT_ROUTE_BY_ROLE, LOGIN_ROUTE } from '../constants'

interface Props {
  requiredRole: string
  children: React.ReactNode
}

const ProtectedRoute: React.FC<Props> = ({ requiredRole, children }) => {
  const role = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_ROLE)
  if (role !== requiredRole) {
    const fallback = role ? (DEFAULT_ROUTE_BY_ROLE[role] ?? DEFAULT_ROUTE) : LOGIN_ROUTE
    return <Navigate to={fallback} replace />
  }
  return <>{children}</>
}

export default ProtectedRoute

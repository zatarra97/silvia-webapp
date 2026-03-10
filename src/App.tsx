import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { CognitoUser, CognitoUserPool } from 'amazon-cognito-identity-js'
import { Provider, ErrorBoundary } from '@rollbar/react'
import AdminDashboard from './Pages/Admin/AdminDashboard'
import PatientList from './Pages/Patients/PatientList'
import PatientDetail from './Pages/Patients/PatientDetail'
import WardList from './Pages/Wards/WardList'
import SiteList from './Pages/Sites/SiteList'
import AntimicrobialTherapyList from './Pages/AntimicrobialTherapies/AntimicrobialTherapyList'
import BsiPathogenList from './Pages/BsiPathogens/BsiPathogenList'
import ResistanceProfileList from './Pages/ResistanceProfiles/ResistanceProfileList'
import AstAntibioticList from './Pages/AstAntibiotics/AstAntibioticList'
import Login from './Pages/Auth/Login'
import './App.css'
import NotFound from './Pages/NotFound/NotFound'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import AdminLayout from './Components/AdminLayout'
import { ThemeConfig } from "flowbite-react"
import { ThemeInit } from "../.flowbite-react/init"
import { LOCAL_STORAGE_KEYS, resolveRole } from './constants'
import { ping } from './services/api-utility'

const rollbarConfig = {
  accessToken: import.meta.env.VITE_ROLLBAR_TOKEN,
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
}

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID
}
const userPool = new CognitoUserPool(poolData)

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<CognitoUser | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [connectionError, setConnectionError] = useState(false)
  const navigate = useNavigate()

  const redirectToLogin = (withReturnUrl: boolean = true) => {
    setIsAuthenticated(false)
    setUser(null)
    const currentPath = `${window.location.pathname}${window.location.search}`
    const isAlreadyLogin = window.location.pathname.startsWith('/accesso/login')
    if (withReturnUrl && !isAlreadyLogin && currentPath) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.RETURN_URL, currentPath)
    }
    navigate('/accesso/login')
  }

  useEffect(() => {
    checkAuthState()
  }, [])

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await ping()
        setConnectionError(false)
      } catch (error) {
        setConnectionError(true)
      }
    }
    checkConnection()
    const intervalId = setInterval(checkConnection, 30000)
    return () => clearInterval(intervalId)
  }, [])

  const checkAuthState = async () => {
    setIsCheckingAuth(true)
    const cognitoUser = userPool.getCurrentUser()
    if (!cognitoUser) {
      setIsAuthenticated(false)
      setUser(null)
      setIsCheckingAuth(false)
      redirectToLogin(true)
      return
    }

    try {
      const session: any = await Promise.race([
        new Promise((resolve, reject) => {
          cognitoUser.getSession((err: any, session: any) => {
            if (err) reject(err)
            else resolve(session)
          })
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 2500))
      ])

      if (session && session.isValid && session.isValid()) {
        const idToken = session.getIdToken().getJwtToken()
        const payload = JSON.parse(atob(idToken.split('.')[1]))
        const email = payload.email || payload['cognito:username'] || ''
        const groups: string[] = payload['cognito:groups'] ?? []
        const role = resolveRole(groups)
        setIsAuthenticated(true)
        setUser(cognitoUser)
        localStorage.setItem(LOCAL_STORAGE_KEYS.JWT_TOKEN, idToken)
        localStorage.setItem(LOCAL_STORAGE_KEYS.ID_TOKEN, idToken)
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, session.getAccessToken().getJwtToken())
        if (email) localStorage.setItem(LOCAL_STORAGE_KEYS.USER_EMAIL, email)
        localStorage.setItem(LOCAL_STORAGE_KEYS.USER_ROLE, role)
      } else {
        setIsAuthenticated(false)
        setUser(null)
        redirectToLogin(true)
      }
    } catch {
      setIsAuthenticated(false)
      setUser(null)
      localStorage.removeItem(LOCAL_STORAGE_KEYS.JWT_TOKEN)
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ID_TOKEN)
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN)
      redirectToLogin(true)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const signOut = () => {
    const cognitoUser = userPool.getCurrentUser()
    if (cognitoUser) cognitoUser.signOut()
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem(LOCAL_STORAGE_KEYS.JWT_TOKEN)
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ID_TOKEN)
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_EMAIL)
    localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_ROLE)
    localStorage.removeItem(LOCAL_STORAGE_KEYS.RETURN_URL)
    redirectToLogin(false)
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f8]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Recupero informazioni autenticazione</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <ToastContainer />
        <Routes>
          <Route path="/accesso/login" element={<Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} setUserRole={() => {}} />} />
          <Route path="*" element={<Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} setUserRole={() => {}} />} />
        </Routes>
      </>
    )
  }

  return (
    <>
      <ToastContainer />
      <AdminLayout
        userEmail={localStorage.getItem(LOCAL_STORAGE_KEYS.USER_EMAIL) || ''}
        onLogout={signOut}
      >
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/patients" element={<PatientList />} />
          <Route path="/admin/patients/new" element={<PatientDetail />} />
          <Route path="/admin/patients/:id" element={<PatientDetail />} />
          <Route path="/admin/wards" element={<WardList />} />
          <Route path="/admin/sites" element={<SiteList />} />
          <Route path="/admin/antimicrobial-therapies" element={<AntimicrobialTherapyList />} />
          <Route path="/admin/bsi-pathogens" element={<BsiPathogenList />} />
          <Route path="/admin/resistance-profiles" element={<ResistanceProfileList />} />
          <Route path="/admin/ast-antibiotics" element={<AstAntibioticList />} />
          <Route path="/accesso/login" element={<Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} setUserRole={() => {}} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AdminLayout>
    </>
  )
}

const App: React.FC = () => {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <ThemeInit />
      <ThemeConfig dark={false} />
      <Provider config={rollbarConfig}>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </Provider>
    </Router>
  )
}

export default App

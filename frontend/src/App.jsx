import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SatkerPortal from './pages/SatkerPortal'
import UserManagement from './pages/UserManagement'
import MasterData from './pages/MasterData'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Informasi from './pages/Informasi'
import Layout from './components/Layout'

/**
 * Route protection wrapper. Ensures user is logged in
 * and has one of the allowed roles.
 */
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('satya_token');
  const user = JSON.parse(localStorage.getItem('satya_user') || 'null');

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirection fallback if accessing unauthorized route
    if (user.role === 'SATKER_PN') return <Navigate to="/portal" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter basename="/satya">
      <Routes>
        <Route path="/" element={<Landing />} />
        
        {/* Unprotected Auth route */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Dashboard/API Routes wrapped in App Shell Layout */}
        <Route element={<Layout />}>
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN_PT', 'PIMPINAN']}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/users" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN_PT']}>
                <UserManagement />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/informasi" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN_PT', 'PIMPINAN']}>
                <Informasi />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/master" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN_PT']}>
                <MasterData />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/portal" 
            element={
              <ProtectedRoute allowedRoles={['SATKER_PN']}>
                <SatkerPortal />
              </ProtectedRoute>
            } 
          />
          
        </Route>

        <Route path="*" element={<h1 className="p-8 text-center text-slate-500">Halaman tidak ditemukan (404)</h1>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

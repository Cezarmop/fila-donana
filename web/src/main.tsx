import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import Entrar from './pages/Entrar'
import Acompanhar from './pages/Acompanhar'
import Painel from './pages/Painel'
import Cartaz from './pages/Cartaz'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/entrar" replace />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/acompanhar/:id" element={<Acompanhar />} />
        <Route path="/painel" element={<Painel />} />
        <Route path="/cartaz" element={<Cartaz />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

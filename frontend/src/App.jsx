import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { ScanLine, FileText, Download, AlertCircle, LayoutDashboard, Package } from "lucide-react";
import ScanPage from "./pages/ScanPage";
import NotasPage from "./pages/NotasPage";
import DetalhePage from "./pages/DetalhePage";
import ExportPage from "./pages/ExportPage";
import ContasAPagarPage from "./pages/ContasAPagarPage";
import DashboardPage from "./pages/DashboardPage";
import InsumoPage from "./pages/InsumoPage";
import LandingPage from "./pages/LandingPage";
import { LMAgroSidebarLogo } from "./components/LMAgroLogo";
import "./App.css";

function AppLayout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <LMAgroSidebarLogo />
        </div>
        <nav>
          <NavLink to="/app" end className={({ isActive }) => isActive ? "active" : ""}>
            <ScanLine size={16} /> Escanear
          </NavLink>
          <NavLink to="/app/notas" className={({ isActive }) => isActive ? "active" : ""}>
            <FileText size={16} /> Notas
          </NavLink>
          <NavLink to="/app/contas" className={({ isActive }) => isActive ? "active" : ""}>
            <AlertCircle size={16} /> Contas a Pagar
          </NavLink>
          <NavLink to="/app/insumos" className={({ isActive }) => isActive ? "active" : ""}>
            <Package size={16} /> Insumos
          </NavLink>
          <NavLink to="/app/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
            <LayoutDashboard size={16} /> Painel Financeiro
          </NavLink>
          <NavLink to="/app/exportar" className={({ isActive }) => isActive ? "active" : ""}>
            <Download size={16} /> Exportar
          </NavLink>
        </nav>
      </aside>

      <main className="main">
        <Routes>
          <Route index element={<ScanPage />} />
          <Route path="notas" element={<NotasPage />} />
          <Route path="notas/:id" element={<DetalhePage />} />
          <Route path="contas" element={<ContasAPagarPage />} />
          <Route path="insumos" element={<InsumoPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="exportar" element={<ExportPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/*" element={<AppLayout />} />
      {/* compatibilidade com rotas antigas */}
      <Route path="/notas/*" element={<Navigate to="/app/notas" replace />} />
      <Route path="/contas" element={<Navigate to="/app/contas" replace />} />
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/exportar" element={<Navigate to="/app/exportar" replace />} />
    </Routes>
  );
}

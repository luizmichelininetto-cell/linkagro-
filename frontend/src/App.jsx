import { Routes, Route, NavLink } from "react-router-dom";
import { ScanLine, FileText, Download, AlertCircle, LayoutDashboard } from "lucide-react";
import ScanPage from "./pages/ScanPage";
import NotasPage from "./pages/NotasPage";
import DetalhePage from "./pages/DetalhePage";
import ExportPage from "./pages/ExportPage";
import ContasAPagarPage from "./pages/ContasAPagarPage";
import DashboardPage from "./pages/DashboardPage";
import { LMAgroSidebarLogo } from "./components/LMAgroLogo";
import "./App.css";

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <LMAgroSidebarLogo />
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>
            <ScanLine size={16} /> Escanear
          </NavLink>
          <NavLink to="/notas" className={({ isActive }) => isActive ? "active" : ""}>
            <FileText size={16} /> Notas
          </NavLink>
          <NavLink to="/contas" className={({ isActive }) => isActive ? "active" : ""}>
            <AlertCircle size={16} /> Contas a Pagar
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
            <LayoutDashboard size={16} /> Painel Financeiro
          </NavLink>
          <NavLink to="/exportar" className={({ isActive }) => isActive ? "active" : ""}>
            <Download size={16} /> Exportar
          </NavLink>
        </nav>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<ScanPage />} />
          <Route path="/notas" element={<NotasPage />} />
          <Route path="/notas/:id" element={<DetalhePage />} />
          <Route path="/contas" element={<ContasAPagarPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/exportar" element={<ExportPage />} />
        </Routes>
      </main>
    </div>
  );
}

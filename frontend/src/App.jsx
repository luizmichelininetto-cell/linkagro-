import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import {
  ScanLine, FileText, Download, AlertCircle, LayoutDashboard,
  Package, Users, LogOut, ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ScanPage from "./pages/ScanPage";
import NotasPage from "./pages/NotasPage";
import DetalhePage from "./pages/DetalhePage";
import ExportPage from "./pages/ExportPage";
import ContasAPagarPage from "./pages/ContasAPagarPage";
import DashboardPage from "./pages/DashboardPage";
import InsumoPage from "./pages/InsumoPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import UsuariosPage from "./pages/UsuariosPage";
import NotaManualPage from "./pages/NotaManualPage";
import "./App.css";

function SidebarLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "linear-gradient(135deg, #5bae30, #3d8a18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{ color: "#fff", fontWeight: 900, fontSize: 18, fontFamily: "serif" }}>G</span>
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 13, color: "#fff", lineHeight: 1.2 }}>Gestão de</div>
        <div style={{ fontWeight: 800, fontSize: 13, color: "#7acc3a", lineHeight: 1.2 }}>Fazendas</div>
      </div>
    </div>
  );
}

function UserMenu() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8,
          padding: "8px 10px", cursor: "pointer",
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: "50%", background: "#5bae30",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
        }}>
          {usuario?.nome?.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, textAlign: "left", overflow: "hidden" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {usuario?.nome}
          </div>
          <div style={{ fontSize: 10, color: "#7acc3a" }}>
            {usuario?.fazenda_nome || "Super Admin"}
          </div>
        </div>
        <ChevronDown size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "110%", left: 0, right: 0,
          background: "#fff", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          overflow: "hidden", zIndex: 100,
        }}>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "10px 14px", background: "none", border: "none",
              cursor: "pointer", color: "#dc2626", fontSize: 13, fontWeight: 600,
            }}
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

function AppLayout() {
  const { temPermissao, usuario } = useAuth();
  const isAdmin = usuario?.papel === "super_admin" || usuario?.papel === "admin_fazenda";

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo"><SidebarLogo /></div>
        <nav>
          {temPermissao("ver_dashboard") && (
            <NavLink to="/app/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
              <LayoutDashboard size={16} /> Painel Financeiro
            </NavLink>
          )}
          {temPermissao("escanear") && (
            <NavLink to="/app/escanear" className={({ isActive }) => isActive ? "active" : ""}>
              <ScanLine size={16} /> Escanear
            </NavLink>
          )}
          {temPermissao("ver_notas") && (
            <NavLink to="/app/notas" className={({ isActive }) => isActive ? "active" : ""}>
              <FileText size={16} /> Notas
            </NavLink>
          )}
          {temPermissao("ver_contas") && (
            <NavLink to="/app/contas" className={({ isActive }) => isActive ? "active" : ""}>
              <AlertCircle size={16} /> Contas a Pagar
            </NavLink>
          )}
          {temPermissao("ver_insumos") && (
            <NavLink to="/app/insumos" className={({ isActive }) => isActive ? "active" : ""}>
              <Package size={16} /> Insumos
            </NavLink>
          )}
          {temPermissao("exportar") && (
            <NavLink to="/app/exportar" className={({ isActive }) => isActive ? "active" : ""}>
              <Download size={16} /> Exportar
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/app/usuarios" className={({ isActive }) => isActive ? "active" : ""}>
              <Users size={16} /> Usuários
            </NavLink>
          )}
        </nav>
        <div style={{ marginTop: "auto", padding: "0 8px 8px" }}>
          <UserMenu />
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="escanear" element={<ScanPage />} />
          <Route path="notas" element={<NotasPage />} />
          <Route path="notas/:id" element={<DetalhePage />} />
          <Route path="contas" element={<ContasAPagarPage />} />
          <Route path="insumos" element={<InsumoPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="exportar" element={<ExportPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="notas/nova" element={<NotaManualPage />} />
        </Routes>
      </main>
    </div>
  );
}

function AuthGuard({ children }) {
  const { usuario, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="spinner" />
    </div>
  );
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app/*" element={<AuthGuard><AppLayout /></AuthGuard>} />
        <Route path="/notas/*" element={<Navigate to="/app/notas" replace />} />
        <Route path="/contas" element={<Navigate to="/app/contas" replace />} />
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/exportar" element={<Navigate to="/app/exportar" replace />} />
      </Routes>
    </AuthProvider>
  );
}

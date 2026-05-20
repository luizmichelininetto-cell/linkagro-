import { useState, useEffect } from "react";
import { Users, Plus, Check, X, Edit2 } from "lucide-react";
import { listarUsuarios, criarUsuario, atualizarUsuario, listarFazendas, criarFazenda } from "../api";
import { useAuth } from "../context/AuthContext";

const PERMISSOES_LABELS = {
  escanear: "Escanear NF",
  ver_notas: "Ver Notas",
  ver_contas: "Ver Contas a Pagar",
  ver_insumos: "Ver Insumos",
  ver_dashboard: "Ver Painel",
  exportar: "Exportar",
};

const PAPEL_LABEL = { super_admin: "Super Admin", admin_fazenda: "Admin Fazenda", funcionario: "Funcionário" };
const PAPEL_COLOR = { super_admin: "#7c3aed", admin_fazenda: "#2563eb", funcionario: "#475569" };

function PermissaoToggle({ label, checked, onChange, disabled }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, position: "relative",
          background: checked ? "#5bae30" : "#e2e8f0", transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div style={{
          position: "absolute", top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </div>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
    </label>
  );
}

export default function UsuariosPage() {
  const { usuario: eu } = useAuth();
  const isSuperAdmin = eu?.papel === "super_admin";

  const [usuarios, setUsuarios] = useState([]);
  const [fazendas, setFazendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showFazendaForm, setShowFazendaForm] = useState(false);
  const [novaFazenda, setNovaFazenda] = useState("");
  const [form, setForm] = useState({ nome: "", email: "", senha: "", papel: "funcionario", fazenda_id: "", permissoes: { escanear: true, ver_notas: false, ver_contas: false, ver_insumos: false, ver_dashboard: false, exportar: false } });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const carregar = async () => {
    try {
      const [u, f] = await Promise.all([listarUsuarios(), isSuperAdmin ? listarFazendas() : Promise.resolve({ data: [] })]);
      setUsuarios(u.data);
      setFazendas(f.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const abrirEdicao = (u) => {
    setEditando(u.id);
    setForm({
      nome: u.nome, email: u.email, senha: "", papel: u.papel,
      fazenda_id: u.fazenda_id || "",
      permissoes: { ...{ escanear: true, ver_notas: false, ver_contas: false, ver_insumos: false, ver_dashboard: false, exportar: false }, ...u.permissoes },
    });
    setShowForm(true);
    setErro(null);
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm({ nome: "", email: "", senha: "", papel: "funcionario", fazenda_id: fazendas[0]?.id || "", permissoes: { escanear: true, ver_notas: false, ver_contas: false, ver_insumos: false, ver_dashboard: false, exportar: false } });
    setShowForm(true);
    setErro(null);
  };

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const payload = {
        nome: form.nome, email: form.email, papel: form.papel,
        fazenda_id: form.fazenda_id || null,
        permissoes: form.permissoes,
      };
      if (form.senha) payload.senha = form.senha;
      if (editando) {
        await atualizarUsuario(editando, payload);
      } else {
        if (!form.senha) { setErro("Senha obrigatória para novo usuário."); setSalvando(false); return; }
        await criarUsuario({ ...payload, senha: form.senha });
      }
      setShowForm(false);
      carregar();
    } catch (e) {
      setErro(e?.response?.data?.detail || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const toggleAtivo = async (u) => {
    await atualizarUsuario(u.id, { ativo: !u.ativo });
    carregar();
  };

  const salvarFazenda = async () => {
    if (!novaFazenda.trim()) return;
    await criarFazenda({ nome: novaFazenda.trim() });
    setNovaFazenda("");
    setShowFazendaForm(false);
    carregar();
  };

  const isAdmin = form.papel === "super_admin" || form.papel === "admin_fazenda";

  if (loading) return <div className="empty"><span className="spinner" /></div>;

  return (
    <>
      <div className="page-title"><Users size={22} /> Usuários</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={abrirNovo} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={15} /> Novo Usuário
        </button>
        {isSuperAdmin && (
          <button className="btn btn-secondary" onClick={() => setShowFazendaForm((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} /> Nova Fazenda
          </button>
        )}
      </div>

      {showFazendaForm && (
        <div className="card" style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={novaFazenda}
            onChange={(e) => setNovaFazenda(e.target.value)}
            placeholder="Nome da fazenda"
            style={{ flex: 1, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14 }}
          />
          <button className="btn btn-primary" onClick={salvarFazenda}>Criar</button>
          <button className="btn btn-secondary" onClick={() => setShowFazendaForm(false)}>Cancelar</button>
        </div>
      )}

      {isSuperAdmin && fazendas.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {fazendas.map((f) => (
            <span key={f.id} style={{ padding: "4px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, fontSize: 13, color: "#16a34a" }}>
              {f.nome}
            </span>
          ))}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 16 }}>{editando ? "Editar Usuário" : "Novo Usuário"}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Nome</label>
              <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{editando ? "Nova senha (deixe em branco para manter)" : "Senha"}</label>
              <input type="password" value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Papel</label>
              <select value={form.papel} onChange={(e) => setForm((f) => ({ ...f, papel: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}>
                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                <option value="admin_fazenda">Admin Fazenda</option>
                <option value="funcionario">Funcionário</option>
              </select>
            </div>
            {isSuperAdmin && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Fazenda</label>
                <select value={form.fazenda_id} onChange={(e) => setForm((f) => ({ ...f, fazenda_id: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}>
                  {form.papel === "super_admin" && <option value="">— nenhuma —</option>}
                  {fazendas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
            )}
          </div>

          {!isAdmin && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 10 }}>Permissões</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {Object.entries(PERMISSOES_LABELS).map(([key, label]) => (
                  <PermissaoToggle key={key} label={label} checked={form.permissoes[key]}
                    onChange={(v) => setForm((f) => ({ ...f, permissoes: { ...f.permissoes, [key]: v } }))} />
                ))}
              </div>
            </div>
          )}

          {erro && <div className="alert alert-error" style={{ marginTop: 12 }}>{erro}</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? <span className="spinner" /> : <><Check size={14} /> Salvar</>}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Papel</th>
                <th>Fazenda</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.5 }}>
                  <td><strong>{u.nome}</strong></td>
                  <td style={{ color: "#64748b", fontSize: 13 }}>{u.email}</td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, color: PAPEL_COLOR[u.papel] }}>
                      {PAPEL_LABEL[u.papel]}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: "#64748b" }}>{u.fazenda_nome || "—"}</td>
                  <td>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: u.ativo ? "#16a34a" : "#94a3b8",
                    }}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-secondary" onClick={() => abrirEdicao(u)}
                        style={{ padding: "4px 10px", fontSize: 12 }}>
                        <Edit2 size={12} />
                      </button>
                      {u.id !== eu?.id && (
                        <button
                          onClick={() => toggleAtivo(u)}
                          style={{
                            padding: "4px 10px", fontSize: 12, border: "none", borderRadius: 6,
                            cursor: "pointer", background: u.ativo ? "#fee2e2" : "#dcfce7",
                            color: u.ativo ? "#b91c1c" : "#16a34a", fontWeight: 600,
                          }}>
                          {u.ativo ? <X size={12} /> : <Check size={12} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>Nenhum usuário cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMe, login as apiLogin, clearToken, setToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  const carregarUsuario = useCallback(async () => {
    try {
      const { data } = await getMe();
      setUsuario(data);
    } catch {
      setUsuario(null);
      clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregarUsuario(); }, [carregarUsuario]);

  const login = async (email, senha) => {
    const { data } = await apiLogin(email, senha);
    setToken(data.access_token);
    await carregarUsuario();
  };

  const logout = () => {
    clearToken();
    setUsuario(null);
  };

  const temPermissao = (perm) => {
    if (!usuario) return false;
    if (usuario.papel === "super_admin" || usuario.papel === "admin_fazenda") return true;
    return usuario.permissoes?.[perm] === true;
  };

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, temPermissao }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

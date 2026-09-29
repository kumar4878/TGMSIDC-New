import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { post, get } from "@/lib/api";

export type UserRole =
  | "deo"
  | "tgmsidc_user"
  | "gm_equipment"
  | "so_equipment"
  | "executive_director"
  | "admin"
  | "vendor"
  | "consignee";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  roleLabel: string;
  designation: string;
  department: string;
  facilityId?: string | null;
  facilityName?: string | null;
  hodMapping?: string | null;
  email: string;
  phone: string;
  initials: string;
}

const PERMISSIONS: Record<UserRole, string[]> = {
  deo: ["indent.create", "indent.view", "indent.draft"],
  tgmsidc_user: ["indent.review", "indent.approve_step", "indent.view", "indent.edit", "equipment.manage", "consolidation.view"],
  gm_equipment: ["indent.approve", "indent.approve_step", "indent.reject", "indent.view", "po.approve", "po.cancel", "po.view", "rc.manage", "tender.manage", "budget.view", "vendor.view", "reports.view"],
  so_equipment: ["indent.sanction", "indent.approve_step", "indent.view", "po.approve", "po.view", "rc.manage", "tender.manage", "budget.view", "vendor.view", "reports.view"],
  executive_director: ["indent.sanction", "indent.approve", "indent.approve_step", "indent.reject", "indent.view", "po.approve", "po.view", "tender.view", "budget.view", "reports.view"],
  admin: ["indent.view", "indent.create", "indent.approve", "po.view", "po.approve", "rc.manage", "tender.manage", "vendor.manage", "equipment.manage", "institution.manage", "budget.view", "reports.view", "users.manage"],
  vendor: ["po.acknowledge", "po.view", "delivery.dispatch", "delivery.cert_upload", "invoice.submit"],
  consignee: ["grn.create", "grn.view", "delivery.receive", "installation.confirm"],
};

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  can: (action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("tgmsidc_token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      get<AuthUser>("/auth/me", undefined, token)
        .then(setUser)
        .catch(() => { localStorage.removeItem("tgmsidc_token"); setToken(null); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  async function login(username: string, password: string) {
    const res = await post<{ token: string; user: AuthUser }>("/auth/login", { username, password });
    localStorage.setItem("tgmsidc_token", res.token);
    setToken(res.token);
    setUser(res.user);
  }

  function logout() {
    localStorage.removeItem("tgmsidc_token");
    setToken(null);
    setUser(null);
  }

  function can(action: string): boolean {
    if (!user) return false;
    if (user.role === "admin") return true;
    return PERMISSIONS[user.role]?.includes(action) ?? false;
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

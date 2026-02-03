import { useEffect, useState } from "react";
import { API_URL, parseJsonResponse } from "../lib/api";
import { clearToken, getToken, subscribe } from "../lib/auth";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role?: string;
  roles?: string[];
  is_active?: boolean;
}

export function useAuthRole() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(getToken());

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setTokenState(getToken());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const currentToken = token;
    if (!currentToken) {
      setUser(null);
      setRole(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadUser = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${currentToken}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          clearToken();
          setUser(null);
          setRole(null);
          return;
        }
        const data = await parseJsonResponse<AuthUser>(res);
        const normalizedRoles =
          data.roles && data.roles.length > 0
            ? data.roles
            : data.role
              ? [data.role]
              : ["user"];
        setUser({ ...data, roles: normalizedRoles, role: normalizedRoles[0] ?? data.role });
        setRoles(normalizedRoles);
        setRole(normalizedRoles[0] ?? "user");
      } catch (err) {
        if (!controller.signal.aborted) {
          setUser(null);
          setRole(null);
          setRoles([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadUser();
    return () => controller.abort();
  }, [token]);

  return { user, role, roles, loading };
}

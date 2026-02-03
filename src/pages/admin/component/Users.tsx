import { useEffect, useState } from "react";
import {
  Box,
  Checkbox,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Button,
  Typography,
} from "@mui/material";
import { apiFetch } from "../../../lib/api";
import AdminHeader from "./AdminHeader";

interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  roles?: string[];
  is_active: boolean;
  created_at: string;
}

const AVAILABLE_ROLES = ["admin", "chef", "user"];

function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["user"]);
  const [active, setActive] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const list = await apiFetch<User[]>("/users/", { auth: true });
      setUsers(list);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    await new Promise((r) => setTimeout(r, 400));
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async () => {
    if (!editingUser) return;
    try {
      const updated = await apiFetch<User>(`/users/${editingUser.id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ roles: selectedRoles, is_active: active }),
      });
      setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user roles:", error);
    }
  };

  const isAdminUser = (u: User) =>
    (u.roles && u.roles.includes("admin")) || u.role === "admin";

  const adminCount = users.filter(isAdminUser).length;

  const handleDelete = async (u: User) => {
    if (isAdminUser(u) && adminCount <= 1) {
      alert("Oxirgi adminni o'chirib bo'lmaydi.");
      return;
    }
    const ok = window.confirm(`${u.name} (${u.email}) ni o'chirmoqchimisiz?`);
    if (!ok) return;
    try {
      setDeletingId(u.id);
      await apiFetch(`/users/${u.id}`, { method: "DELETE", auth: true });
      setUsers(users.filter((item) => item.id !== u.id));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("O'chirishda xatolik bo'ldi.");
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "#e74c3c",
      user: "#3498db",
      chef: "#2ecc71",
    };
    return (
      <span
        key={role}
        style={{
          backgroundColor: colors[role] || "#7f8c8d",
          color: "white",
          padding: "2px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          marginRight: "5px",
          textTransform: "capitalize",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        {role}
      </span>
    );
  };

  return (
    <Box sx={{ p: 4 }} className="admin-section">
      <AdminHeader title="Users" subtitle="Rol va faollikni boshqarish" />

      {loading ? (
        <Box className="admin-skeleton admin-skeleton-card" sx={{ height: 220 }} />
      ) : (
        <Box component="table" className="admin-table">
          <Box component="thead">
            <Box component="tr">
              <Box component="th">Name</Box>
              <Box component="th">Email</Box>
              <Box component="th">Role</Box>
              <Box component="th">Active</Box>
              <Box component="th">Actions</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {users.map((u) => (
              <Box component="tr" key={u.id}>
                <Box component="td">{u.name}</Box>
                <Box component="td">{u.email}</Box>
                <Box component="td">
                  {(u.roles && u.roles.length > 0 ? u.roles : u.role ? [u.role] : ["user"]).map((r) =>
                    getRoleBadge(r)
                  )}
                </Box>
                <Box component="td">{u.is_active ? "Yes" : "No"}</Box>
                <Box component="td">
                  <Button
                    className="admin-warning-btn"
                    variant="contained"
                    sx={{ mr: 1 }}
                    onClick={() => {
                      setEditingUser(u);
                      setSelectedRoles(u.roles && u.roles.length > 0 ? u.roles : u.role ? [u.role] : ["user"]);
                      setActive(u.is_active);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    className="admin-danger-btn"
                    variant="contained"
                    disabled={deletingId === u.id || (isAdminUser(u) && adminCount <= 1)}
                    onClick={() => handleDelete(u)}
                  >
                    {deletingId === u.id ? "Deleting..." : "Delete"}
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {editingUser && (
        <Box className="admin-modal">
          <Box className="admin-modal__card">
            <Typography variant="h6" gutterBottom>
              Edit Roles for {editingUser.name}
            </Typography>
            <Select
              fullWidth
              multiple
              value={selectedRoles}
              onChange={(e) =>
                setSelectedRoles(
                  typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value
                )
              }
              input={<OutlinedInput label="Roles" />}
              renderValue={(selected) => selected.join(", ")}
            >
              {AVAILABLE_ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  <Checkbox checked={selectedRoles.includes(role)} />
                  <ListItemText primary={role} />
                </MenuItem>
              ))}
            </Select>
            <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
              <Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} />
              <Typography>Active</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button variant="contained" color="success" onClick={handleSave} sx={{ mr: 1 }}>
                Save
              </Button>
              <Button variant="contained" color="inherit" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default Users;

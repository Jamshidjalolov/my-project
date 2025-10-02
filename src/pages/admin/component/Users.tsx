import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./Firebase";
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

interface User {
  id: string;
  name: string;
  email: string;
  role: string[];
  createdAt: string;
}

const AVAILABLE_ROLES = ["ADMIN", "CHEF", "user"];

function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // 🔹 Firestore’dan users ma’lumotlarni olib kelish
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const list: User[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || "No name",
          email: data.email || "No email",
          // 🔹 role maydoni har doim array bo‘lishi kerak
          role: Array.isArray(data.role) ? data.role : [data.role || "user"],
          createdAt: data.createdAt
            ? new Date(data.createdAt.seconds * 1000).toLocaleString()
            : "-",
        };
      });
      setUsers(list);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        role: selectedRoles,
      });
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user roles:", error);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm("Haqiqatan ham ushbu userni o‘chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: "#e74c3c",
      user: "#3498db",
      CHEF: "#2ecc71",
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
        }}
      >
        {role}
      </span>
    );
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Users
      </Typography>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead" sx={{ background: "#f4f6f9" }}>
            <Box component="tr">
              <Box component="th" sx={{ p: 2, border: "1px solid #ddd" }}>Name</Box>
              <Box component="th" sx={{ p: 2, border: "1px solid #ddd" }}>Email</Box>
              <Box component="th" sx={{ p: 2, border: "1px solid #ddd" }}>Roles</Box>
              <Box component="th" sx={{ p: 2, border: "1px solid #ddd" }}>Created At</Box>
              <Box component="th" sx={{ p: 2, border: "1px solid #ddd" }}>Actions</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {users.map((u) => (
              <Box component="tr" key={u.id} sx={{ "&:hover": { background: "#f9f9f9" } }}>
                <Box component="td" sx={{ p: 2, border: "1px solid #ddd" }}>{u.name}</Box>
                <Box component="td" sx={{ p: 2, border: "1px solid #ddd" }}>{u.email}</Box>
                <Box component="td" sx={{ p: 2, border: "1px solid #ddd" }}>
                  {u.role.map((r) => getRoleBadge(r))}
                </Box>
                <Box component="td" sx={{ p: 2, border: "1px solid #ddd" }}>{u.createdAt}</Box>
                <Box component="td" sx={{ p: 2, border: "1px solid #ddd" }}>
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mr: 1 }}
                    onClick={() => {
                      setEditingUser(u);
                      setSelectedRoles(u.role);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleDelete(u.id)}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            bgcolor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box sx={{ bgcolor: "white", p: 4, borderRadius: 2, width: 400 }}>
            <Typography variant="h6" gutterBottom>
              Edit Roles for {editingUser.name}
            </Typography>
            <Select
              multiple
              fullWidth
              value={selectedRoles}
              onChange={(e) => {
                const value = typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value;
                setSelectedRoles(value);
              }}
              input={<OutlinedInput label="Roles" />}
              renderValue={(selected) => (selected as string[]).join(", ")}
            >
              {AVAILABLE_ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  <Checkbox checked={selectedRoles.includes(role)} />
                  <ListItemText primary={role} />
                </MenuItem>
              ))}
            </Select>
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

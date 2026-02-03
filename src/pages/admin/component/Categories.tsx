import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import AdminHeader from "./AdminHeader";

interface Category {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
}

function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Category>>({
    name: "",
    description: "",
    image: "",
  });
  const [showModal, setShowModal] = useState(false);

  const fetchCategories = async () => {
    try {
      const data = await apiFetch<Category[]>("/categories/");
      setCategories(data);
    } catch (error) {
      console.error("Fetch categories error:", error);
    } finally {
      await new Promise((r) => setTimeout(r, 400));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      alert("Category nomi kerak!");
      return;
    }
    try {
      if (editId) {
        const updated = await apiFetch<Category>(`/categories/${editId}`, {
          method: "PUT",
          auth: true,
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            image: form.image,
          }),
        });
        setCategories(categories.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await apiFetch<Category>("/categories/", {
          method: "POST",
          auth: true,
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            image: form.image,
          }),
        });
        setCategories([created, ...categories]);
      }
      setForm({ name: "", description: "", image: "" });
      setEditId(null);
      setShowModal(false);
    } catch (error) {
      console.error("Save category error:", error);
    }
  };

  const handleEdit = (category: Category) => {
    setEditId(category.id);
    setForm({
      name: category.name,
      description: category.description ?? "",
      image: category.image ?? "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
    try {
      await apiFetch(`/categories/${id}`, { method: "DELETE", auth: true });
      setCategories(categories.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Delete category error:", error);
    }
  };

  return (
    <div className="admin-section">
      <AdminHeader
        title="Categories"
        subtitle="Kategoriya qo'shish va boshqarish"
        right={
          <button
            className="admin-primary-btn"
            onClick={() => {
              setEditId(null);
              setForm({ name: "", description: "", image: "" });
              setShowModal(true);
            }}
          >
            Add Category
          </button>
        }
      />

      {loading ? (
        <div className="admin-scroll">
          <div className="admin-skeleton admin-skeleton-card" style={{ height: 220 }} />
        </div>
      ) : (
        <div className="admin-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length > 0 ? (
                categories.map((cat, index) => (
                  <tr key={cat.id}>
                    <td>{index + 1}</td>
                    <td>{cat.name}</td>
                    <td>{cat.description || "-"}</td>
                    <td>
                      <button
                        onClick={() => handleEdit(cat)}
                        className="admin-warning-btn"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="admin-danger-btn"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "16px" }}>
                    Category topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="admin-modal">
          <div className="admin-modal__card">
            <h2>{editId ? "Edit Category" : "Add Category"}</h2>
            <form onSubmit={handleSubmit} className="admin-form">
              <input
                type="text"
                placeholder="Category name"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Description"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <input
                type="text"
                placeholder="Image URL"
                value={form.image || ""}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
              />
              <div className="admin-modal__actions">
                <button
                  type="button"
                  className="admin-danger-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-primary-btn">
                  {editId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Categories;

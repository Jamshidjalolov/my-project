import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./Firebase";

interface Product {
  id: string;
  category: string;
}

function ProductsCategoryCRUD() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");

  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, "product"));
      const data: Product[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        category: (docSnap.data() as any).category,
      }));
      setProducts(data);
    } catch (error) {
      console.error("Xato:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleUpdate = async (id: string) => {
    if (!newCategory.trim()) {
      alert("Yangi category tanlang!");
      return;
    }
    try {
      const ref = doc(db, "product", id);
      await updateDoc(ref, { category: newCategory });
      alert("Category yangilandi ✅");
      setEditId(null);
      setNewCategory("");
      fetchProducts();
    } catch (error) {
      console.error("Yangilashda xato:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Haqiqatan ham o‘chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "product", id));
      alert("Product o‘chirildi 🗑️");
      fetchProducts();
    } catch (error) {
      console.error("O‘chirishda xato:", error);
    }
  };

  const categories = Array.from(new Set(products.map((p) => p.category)));

  return (
    <div style={{ padding: "20px", margin: "auto", }}>
      <h2 style={{ marginBottom: "20px", color: "#343a40",textAlign: "center" }}>📂 Categories</h2>

      {loading ? (
        <p>⏳ Yuklanmoqda...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "70%",
              borderCollapse: "collapse",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              borderRadius: "8px",
              overflow: "hidden",
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
             margin: "auto",
            }}
          >
            <thead>
              <tr style={{ background: "#495057", color: "#fff", textAlign: "left" }}>
                <th style={{ padding: "12px 16px" }}>#</th>
                <th style={{ padding: "12px 16px" }}>Category</th>
                <th style={{ padding: "12px 16px" }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((prod, index) => (
                  <tr key={prod.id} style={{ borderBottom: "1px solid #dee2e6", transition: "background 0.3s" }}>
                    <td style={{ padding: "12px 16px" }}>{index + 1}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {editId === prod.id ? (
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "5px",
                            border: "1px solid #ced4da",
                            background: "#f8f9fa",
                            fontSize: "14px",
                          }}
                        >
                          <option value="">-- Category tanlang --</option>
                          {categories.map((cat, i) => (
                            <option key={i} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      ) : (
                        prod.category
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {editId === prod.id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(prod.id)}
                            style={{
                              marginRight: "8px",
                              background: "#28a745",
                              color: "#fff",
                              padding: "6px 12px",
                              border: "none",
                              borderRadius: "5px",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            Saqlash
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            style={{
                              background: "#6c757d",
                              color: "#fff",
                              padding: "6px 12px",
                              border: "none",
                              borderRadius: "5px",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            ❌ Bekor qilish
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditId(prod.id);
                              setNewCategory(prod.category || "");
                            }}
                            style={{
                              marginRight: "8px",
                              background: "#0d6efd",
                              color: "#fff",
                              padding: "6px 12px",
                              border: "none",
                              borderRadius: "5px",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(prod.id)}
                            style={{
                              background: "#dc3545",
                              color: "#fff",
                              padding: "6px 12px",
                              border: "none",
                              borderRadius: "5px",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "16px" }}>
                    Category topilmadi 😔
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        table tbody tr:hover {
          background: #f1f3f5;
        }
        button:hover {
          opacity: 0.85;
        }
      `}</style>
    </div>
  );
}

export default ProductsCategoryCRUD;

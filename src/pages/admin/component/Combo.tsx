import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import AdminHeader from "./AdminHeader";

interface ComboItem {
  id: number;
  name: string;
  description?: string | null;
  old_price?: string | null;
  new_price?: string | null;
  img?: string | null;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  discount_price?: number | null;
  image?: string | null;
}

const emptyForm = {
  name: "",
  description: "",
  old_price: "",
  new_price: "",
  img: "",
  day: 0,
  hour: 0,
  minute: 0,
  second: 0,
};

function Combo() {
  const [combo, setCombo] = useState<ComboItem | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<number | "">("");

  const load = async () => {
    try {
      setFetching(true);
      const [comboData, productData] = await Promise.all([
        apiFetch<ComboItem[]>("/main7/", { auth: true }),
        apiFetch<Product[]>("/products/", { auth: true }),
      ]);
      setProducts(productData);
      const data = comboData;
      const current = data[0] ?? null;
      setCombo(current);
      if (current) {
        setForm({
          name: current.name ?? "",
          description: current.description ?? "",
          old_price: current.old_price ?? "",
          new_price: current.new_price ?? "",
          img: current.img ?? "",
          day: current.day ?? 0,
          hour: current.hour ?? 0,
          minute: current.minute ?? 0,
          second: current.second ?? 0,
        });
        const matched = productData.find(
          (p) => p.name.toLowerCase() === (current.name || "").toLowerCase()
        );
        setProductId(matched?.id ?? "");
      } else {
        setForm({ ...emptyForm });
        setProductId("");
      }
    } catch (error) {
      console.error("Combo fetch error:", error);
    } finally {
      await new Promise((r) => setTimeout(r, 400));
      setFetching(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      alert("Combo nomi kerak!");
      return;
    }
    setLoading(true);
    try {
      if (combo?.id) {
        const updated = await apiFetch<ComboItem>(`/main7/${combo.id}`, {
          method: "PUT",
          auth: true,
          body: JSON.stringify(form),
        });
        setCombo(updated);
      } else {
        const created = await apiFetch<ComboItem>("/main7/", {
          method: "POST",
          auth: true,
          body: JSON.stringify(form),
        });
        setCombo(created);
      }
      await load();
    } catch (error) {
      console.error("Combo save error:", error);
      alert("Saqlashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!combo?.id) return;
    const ok = window.confirm("Combo ni o'chirmoqchimisiz?");
    if (!ok) return;
    try {
      await apiFetch(`/main7/${combo.id}`, { method: "DELETE", auth: true });
      setCombo(null);
      setForm({ ...emptyForm });
    } catch (error) {
      console.error("Combo delete error:", error);
      alert("O'chirishda xatolik.");
    }
  };

  return (
    <div className="admin-section">
      <AdminHeader
        title="Combo (faqat bitta)"
        subtitle="Yangi combo qo'shsangiz eski combo almashtiriladi."
        right={
          <div style={{ display: "flex", gap: 10 }}>
            {combo?.id && (
              <button className="admin-danger-btn" onClick={remove}>
                Delete
              </button>
            )}
            <button className="admin-primary-btn" onClick={save} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        }
      />

      {fetching ? (
        <div className="admin-skeleton admin-skeleton-card" style={{ height: 140, marginBottom: 14 }} />
      ) : combo ? (
        <div className="admin-slide-card">
          <img src={combo.img || ""} alt={combo.name} />
          <div className="admin-slide-card__body">
            <h3>{combo.name}</h3>
            <p>{combo.description || "—"}</p>
            <p>
              {combo.old_price ? `${combo.old_price} → ` : ""}
              {combo.new_price || ""}
            </p>
          </div>
        </div>
      ) : null}

      <div className="admin-form combo-form">
        <select
          value={productId}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : "";
            setProductId(id);
            const selected = products.find((p) => p.id === id);
            if (selected) {
              setForm((p) => ({
                ...p,
                name: selected.name,
                img: selected.image || p.img,
                new_price: selected.discount_price
                  ? String(selected.discount_price)
                  : String(selected.price),
                old_price: selected.discount_price ? String(selected.price) : p.old_price,
              }));
            }
          }}
        >
          <option value="">Combo mahsulotini tanlang</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Combo nomi"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <textarea
          placeholder="Ta'rif"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />
        <input
          type="text"
          placeholder="Old price (ixtiyoriy)"
          value={form.old_price}
          onChange={(e) => setForm((p) => ({ ...p, old_price: e.target.value }))}
        />
        <input
          type="text"
          placeholder="New price"
          value={form.new_price}
          onChange={(e) => setForm((p) => ({ ...p, new_price: e.target.value }))}
        />
        <input
          type="text"
          placeholder="Image URL"
          value={form.img}
          onChange={(e) => setForm((p) => ({ ...p, img: e.target.value }))}
        />
        <div className="combo-timer">
          <input
            type="number"
            min={0}
            placeholder="Day"
            value={form.day}
            onChange={(e) => setForm((p) => ({ ...p, day: Number(e.target.value || 0) }))}
          />
          <input
            type="number"
            min={0}
            placeholder="Hour"
            value={form.hour}
            onChange={(e) => setForm((p) => ({ ...p, hour: Number(e.target.value || 0) }))}
          />
          <input
            type="number"
            min={0}
            placeholder="Minute"
            value={form.minute}
            onChange={(e) => setForm((p) => ({ ...p, minute: Number(e.target.value || 0) }))}
          />
          <input
            type="number"
            min={0}
            placeholder="Second"
            value={form.second}
            onChange={(e) => setForm((p) => ({ ...p, second: Number(e.target.value || 0) }))}
          />
        </div>
      </div>
    </div>
  );
}

export default Combo;

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { apiFetch } from "../../../lib/api";
import AdminHeader from "./AdminHeader";

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  discount_price?: number | null;
  image?: string | null;
  category_id: number;
  is_available: boolean;
}

function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    price: 0,
    discount_price: 0,
    image: "",
    category_id: 0,
    is_available: true,
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchCategories()]);
      await new Promise((r) => setTimeout(r, 400));
      setLoading(false);
    };
    load();
  }, []);

  async function fetchProducts() {
    const list = await apiFetch<Product[]>("/products/");
    setProducts(list);
  }

  async function fetchCategories() {
    const list = await apiFetch<Category[]>("/categories/");
    setCategories(list);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category_id) {
      alert("Nom, narx va kategoriya majburiy!");
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      price: Number(formData.price),
      discount_price: formData.discount_price ? Number(formData.discount_price) : null,
      image: formData.image,
      category_id: Number(formData.category_id),
      is_available: formData.is_available ?? true,
    };

    try {
      if (editId) {
        const updated = await apiFetch<Product>(`/products/${editId}`, {
          method: "PUT",
          auth: true,
          body: JSON.stringify(payload),
        });
        setProducts(products.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await apiFetch<Product>("/products/", {
          method: "POST",
          auth: true,
          body: JSON.stringify(payload),
        });
        setProducts([created, ...products]);
      }

      setFormData({
        name: "",
        price: 0,
        discount_price: 0,
        image: "",
        category_id: 0,
        is_available: true,
      });
      setEditId(null);
      setOpen(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: number) {
    if (window.confirm("Mahsulotni o'chirmoqchimisiz?")) {
      await apiFetch(`/products/${id}`, { method: "DELETE", auth: true });
      setProducts(products.filter((p) => p.id !== id));
    }
  }

  function handleEdit(product: Product) {
    setFormData({
      name: product.name,
      description: product.description ?? "",
      price: product.price,
      discount_price: product.discount_price || 0,
      image: product.image ?? "",
      category_id: product.category_id,
      is_available: product.is_available,
    });
    setEditId(product.id);
    setOpen(true);
  }

  const categoryName = (id: number) => categories.find((c) => c.id === id)?.name ?? "-";

  const filteredProducts =
    filterCategoryId === "all"
      ? products
      : products.filter((p) => p.category_id === filterCategoryId);

  return (
    <Box p={5} className="admin-section">
      <AdminHeader
        title="Products"
        subtitle="Barcha mahsulotlar va narxlar boshqaruvi"
        right={
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {[{ id: "all", name: "Barchasi" }, ...categories].map((cat) => {
                const isActive =
                  cat.id === "all" ? filterCategoryId === "all" : filterCategoryId === cat.id;
                return (
                  <button
                    key={String(cat.id)}
                    type="button"
                    onClick={() =>
                      setFilterCategoryId(cat.id === "all" ? "all" : Number(cat.id))
                    }
                    className={`admin-hero__pill ${isActive ? "is-active" : ""}`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </Box>
            <Button
              className="admin-primary-btn"
              variant="contained"
              onClick={() => {
                setEditId(null);
                setFormData({
                  name: "",
                  price: 0,
                  discount_price: 0,
                  image: "",
                  category_id: 0,
                  is_available: true,
                });
                setOpen(true);
              }}
            >
              Add Product
            </Button>
          </Box>
        }
      />

      <Box className="admin-scroll">
        {loading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
                <div className="admin-skeleton admin-skeleton-card" style={{ height: 280 }} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={2}>
            {filteredProducts.map((p) => (
              <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card className="admin-card admin-product-card">
                  {p.image && <CardMedia component="img" height="180" image={p.image} alt={p.name} />}
                  <CardContent>
                    <Typography variant="h6">{p.name}</Typography>
                    <Typography>
                      <b>{p.price}</b>{" "}
                      {p.discount_price ? (
                        <span style={{ color: "red" }}>→ {p.discount_price}</span>
                      ) : null}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Category: {categoryName(p.category_id)}
                    </Typography>

                    <Box mt={2} display="flex" gap={1}>
                      <Button className="admin-warning-btn" variant="contained" onClick={() => handleEdit(p)}>
                        Edit
                      </Button>
                      <Button className="admin-danger-btn" variant="contained" onClick={() => handleDelete(p.id)}>
                        Delete
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: "admin-dialog" }}
      >
        <DialogTitle>{editId ? "Edit Product" : "Add Product"}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Mahsulot nomi"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Narxi"
              type="number"
              value={formData.price || ""}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              fullWidth
              required
            />
            <TextField
              label="Chegirma narxi"
              type="number"
              value={formData.discount_price || ""}
              onChange={(e) => setFormData({ ...formData, discount_price: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Rasm URL"
              value={formData.image || ""}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>Kategoriya</InputLabel>
              <Select
                value={formData.category_id || ""}
                onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} color="secondary">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="success">
              {editId ? "Update" : "Add"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

export default Products;

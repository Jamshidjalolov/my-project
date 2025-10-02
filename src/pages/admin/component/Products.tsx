import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./Firebase";
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

interface Product {
  id: string;
  name: string;
  narxi: number;
  keyingi_narx?: number;
  image: string;
  category: string; 
}

function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    narxi: 0,
    keyingi_narx: 0,
    image: "",
    category: "",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchProducts() {
    const snapshot = await getDocs(collection(db, "product"));
    const list: Product[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Product),
    }));
    setProducts(list);
  }

  async function fetchCategories() {
    const snapshot = await getDocs(collection(db, "category"));
    const list: string[] = snapshot.docs.map((d) => (d.data() as any).name);
    setCategories(list);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.narxi || !formData.category) {
      alert("Nom, narx va kategoriya majburiy!");
      return;
    }

    try {
      if (editId) {
        const ref = doc(db, "product", editId);
        await updateDoc(ref, {
          ...formData,
          narxi: Number(formData.narxi),
          keyingi_narx: formData.keyingi_narx ? Number(formData.keyingi_narx) : null,
        });
        alert("Mahsulot yangilandi ✅");
      } else {
        await addDoc(collection(db, "product"), {
          ...formData,
          narxi: Number(formData.narxi),
          keyingi_narx: formData.keyingi_narx ? Number(formData.keyingi_narx) : null,
          createdAt: new Date(),
        });
        alert("Yangi mahsulot qo‘shildi ✅");
      }

      setFormData({
        name: "",
        narxi: 0,
        keyingi_narx: 0,
        image: "",
        category: "",
      });
      setEditId(null);
      setOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    if (window.confirm("Mahsulotni o‘chirmoqchimisiz?")) {
      await deleteDoc(doc(db, "product", id));
      fetchProducts();
    }
  }

  function handleEdit(product: Product) {
    setFormData({
      name: product.name,
      narxi: product.narxi,
      keyingi_narx: product.keyingi_narx || 0,
      image: product.image,
      category: product.category,
    });
    setEditId(product.id);
    setOpen(true);
  }

  return (
    <Box p={5}>
      <Typography variant="h4" gutterBottom>
        📦 Products
      </Typography>

      <Button
        variant="contained"
        color="success"
        onClick={() => {
          setEditId(null);
          setFormData({
            name: "",
            narxi: 0,
            keyingi_narx: 0,
            image: "",
            category: "",
          });
          setOpen(true);
        }}
        sx={{ mb: 2 }}
      >
        ➕ Add Product
      </Button>

      <Box sx={{ maxHeight: "500px", overflowY: "auto", pr: 1 }}>
        <Grid container spacing={2}>
          {products.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
                <CardMedia component="img" height="180" image={p.image} alt={p.name} />
                <CardContent>
                  <Typography variant="h6">{p.name}</Typography>
                  <Typography>
                    <b>${p.narxi}</b>{" "}
                    {p.keyingi_narx ? (
                      <span style={{ color: "red" }}>→ ${p.keyingi_narx}</span>
                    ) : null}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Category: {p.category}
                  </Typography>

                  <Box mt={2} display="flex" gap={1}>
                    <Button variant="contained" color="warning" onClick={() => handleEdit(p)}>
                      ✏️ Edit
                    </Button>
                    <Button variant="contained" color="error" onClick={() => handleDelete(p.id)}>
                      🗑 Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
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
              value={formData.narxi || ""}
              onChange={(e) => setFormData({ ...formData, narxi: Number(e.target.value) })}
              fullWidth
              required
            />
            <TextField
              label="Chegirma narxi"
              type="number"
              value={formData.keyingi_narx || ""}
              onChange={(e) =>
                setFormData({ ...formData, keyingi_narx: Number(e.target.value) })
              }
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
    value={formData.category || ""}
    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
  >
    {[...new Set(products.map((p) => p.category))].map((cat) => (
      <MenuItem key={cat} value={cat}>
        {cat}
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

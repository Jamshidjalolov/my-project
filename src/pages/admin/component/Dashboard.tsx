import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, Typography, Grid, Box } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { apiFetch } from "../../../lib/api";
import AdminHeader from "./AdminHeader";

interface Product {
  id: number;
  name: string;
}

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product?: { id: number; name: string };
}

interface Order {
  id: number;
  status: string;
  created_at?: string;
  updated_at?: string;
  items: OrderItem[];
}

const COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
const STATUS_COLORS: Record<string, string> = {
  completed: "#4caf50",
  pending: "#ff9800",
  cancelled: "#f44336",
};

function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">("month");
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [soldStats, setSoldStats] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, ordersData] = await Promise.all([
          apiFetch<Product[]>("/products/"),
          apiFetch<Order[]>("/orders/", { auth: true }),
        ]);
        setProducts(productsData);
        setOrders(ordersData);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        await new Promise((r) => setTimeout(r, 400));
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const parseDate = (value?: string) => {
    if (!value) return null;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
    const d2 = new Date(`${value}Z`);
    if (!Number.isNaN(d2.getTime())) return d2;
    return null;
  };

  const filteredOrders = useMemo(() => {
    if (period === "all") return orders;
    const hasDates = orders.some((o) => !!o.created_at);
    if (!hasDates) return orders;
    const now = new Date();
    const start = new Date(now);
    if (period === "week") {
      start.setDate(now.getDate() - 7);
    } else if (period === "month") {
      start.setMonth(now.getMonth() - 1);
    } else if (period === "year") {
      start.setFullYear(now.getFullYear() - 1);
    }
    return orders.filter((o) => {
      const created = parseDate(o.created_at) ?? parseDate(o.updated_at);
      if (!created) return true;
      return created >= start && created <= now;
    });
  }, [orders, period]);

  const rangeInfo = useMemo(() => {
    if (filteredOrders.length === 0) return null;
    const dates = filteredOrders
      .map((o) => parseDate(o.created_at) ?? parseDate(o.updated_at))
      .filter((d): d is Date => !!d);
    if (dates.length === 0) return null;
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    return { min, max };
  }, [filteredOrders]);

  useEffect(() => {
    const soldCounts: { [key: string]: number } = {};
    let revenue = 0;

    filteredOrders.forEach((order) => {
      if (order.status === "completed") {
        order.items.forEach((item) => {
          revenue += item.price * item.quantity;
          const key = String(item.product_id);
          soldCounts[key] = (soldCounts[key] || 0) + item.quantity;
        });
      }
    });

    setTotalRevenue(revenue);
    setSoldStats(soldCounts);
  }, [filteredOrders]);

  const chartData = Object.keys(soldStats).map((productId) => {
    const id = Number(productId);
    const product = products.find((p) => p.id === id);
    return {
      id,
      name: product ? product.name : `Product ${productId}`,
      value: soldStats[productId],
    };
  });

  const top5Data = [...chartData].sort((a, b) => b.value - a.value).slice(0, 5);

  const productTable = [...chartData]
    .map((row) => {
      let sum = 0;
      filteredOrders.forEach((order) => {
        if (order.status !== "completed") return;
        order.items.forEach((item) => {
          if (item.product_id === row.id) {
            sum += item.price * item.quantity;
          }
        });
      });
      return {
        id: row.id,
        name: row.name,
        qty: row.value,
        revenue: sum,
      };
    })
    .sort((a, b) => b.qty - a.qty);

  const statusStats: { [key: string]: number } = {};
  filteredOrders.forEach((o) => {
    statusStats[o.status] = (statusStats[o.status] || 0) + 1;
  });

  const statusData = Object.keys(statusStats).map((status) => ({
    name: status,
    value: statusStats[status],
  }));

  const activeOrders = filteredOrders.filter((o) => o.status === "pending").length;
  const completedOrders = filteredOrders.filter((o) => o.status === "completed").length;
  const totalOrders = filteredOrders.length;
  const avgOrderValue = completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0;

  const statCards = [
    {
      title: "Total Revenue",
      value: `${totalRevenue.toLocaleString()} sum`,
      sub: "Completed orders",
      accent: "#16a085",
    },
    {
      title: "Total Orders",
      value: `${totalOrders}`,
      sub: "All statuses",
      accent: "#3b82f6",
    },
    {
      title: "Active Orders",
      value: `${activeOrders}`,
      sub: "Pending now",
      accent: "#f59e0b",
    },
  ];

  if (loading) {
    return (
      <Box sx={{ padding: "24px", minHeight: "100%" }}>
        <div className="admin-skeleton admin-skeleton-card" style={{ height: 140, marginBottom: 24 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="admin-skeleton admin-skeleton-card" style={{ height: 140 }} />
          ))}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
          <div className="admin-skeleton admin-skeleton-card" style={{ height: 320 }} />
          <div className="admin-skeleton admin-skeleton-card" style={{ height: 320 }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        padding: "24px",
        minHeight: "100%",
        background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 60%, #ffffff 100%)",
      }}
    >
      <AdminHeader
        title="Admin Dashboard"
        subtitle="Sotuvlar, buyurtmalar va mahsulotlar bo'yicha jonli statistika"
        right={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { key: "week", label: "Haftalik" },
              { key: "month", label: "Oylik" },
              { key: "year", label: "Yillik" },
              { key: "all", label: "Hammasi" },
            ].map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setPeriod(btn.key as typeof period)}
                className={`admin-hero__pill ${period === btn.key ? "is-active" : ""}`}
              >
                {btn.label}
              </button>
            ))}
            <span className="admin-hero__meta">Natija: {filteredOrders.length}</span>
            {rangeInfo && (
              <span className="admin-hero__meta">
                {rangeInfo.min.toLocaleDateString()} - {rangeInfo.max.toLocaleDateString()}
              </span>
            )}
          </Box>
        }
      />

      <Grid container spacing={3}>
        {statCards.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                borderRadius: 3,
                border: "1px solid rgba(15, 23, 42, 0.08)",
                boxShadow: "0 10px 30px rgba(2, 6, 23, 0.08)",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    background: card.accent,
                    opacity: 0.15,
                    mb: 2,
                  }}
                />
                <Typography variant="subtitle2" sx={{ color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>
                  {card.title}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                  {card.sub}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(15, 23, 42, 0.08)",
              boxShadow: "0 10px 30px rgba(2, 6, 23, 0.08)",
              background: "linear-gradient(180deg, #fff 0%, #f8fafc 100%)",
            }}
          >
            <CardContent>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "14px",
                  background: "#8b5cf6",
                  opacity: 0.15,
                  mb: 2,
                }}
              />
              <Typography variant="subtitle2" sx={{ color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>
                Total Products
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {products.length}
              </Typography>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                Aktiv mahsulotlar
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={12}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 12px 30px rgba(2, 6, 23, 0.08)" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Sotilgan mahsulotlar (tanlangan davr)
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  {period === "week" && "Oxirgi 7 kun"}
                  {period === "month" && "Oxirgi 1 oy"}
                  {period === "year" && "Oxirgi 1 yil"}
                  {period === "all" && "Barcha vaqt"}
                </Typography>
              </Box>
              {productTable.length === 0 ? (
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Bu davrda sotuvlar yo'q.
                </Typography>
              ) : (
                <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                  <Box component="thead">
                    <Box component="tr" sx={{ background: "#0f172a", color: "#fff" }}>
                      <Box component="th" sx={{ textAlign: "left", padding: "10px 12px" }}>
                        Mahsulot
                      </Box>
                      <Box component="th" sx={{ textAlign: "right", padding: "10px 12px" }}>
                        Soni
                      </Box>
                      <Box component="th" sx={{ textAlign: "right", padding: "10px 12px" }}>
                        Summasi
                      </Box>
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {productTable.map((row) => (
                      <Box
                        component="tr"
                        key={row.name}
                        sx={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}
                      >
                        <Box component="td" sx={{ padding: "10px 12px" }}>
                          {row.name}
                        </Box>
                        <Box component="td" sx={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                          {row.qty}
                        </Box>
                        <Box component="td" sx={{ padding: "10px 12px", textAlign: "right" }}>
                          {row.revenue.toLocaleString()} sum
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 12px 30px rgba(2, 6, 23, 0.08)" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Sales Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 12px 30px rgba(2, 6, 23, 0.08)" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Orders Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-status-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 12px 30px rgba(2, 6, 23, 0.08)" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Top 5 Products
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={top5Data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {top5Data.map((_, index) => (
                      <Cell key={`cell-top5-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;

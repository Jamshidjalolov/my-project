import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  Grid,
  ButtonGroup,
  Pagination,
} from "@mui/material";
import { apiFetch, resolveImageUrl } from "../../../lib/api";
import AdminHeader from "./AdminHeader";

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product?: { id: number; name: string; image?: string | null };
}

interface Order {
  id: number;
  user_id: number;
  user?: { id: number; name: string; email: string };
  status: string;
  total_price: number;
  items: OrderItem[];
  delivery_address?: string | null;
  phone?: string | null;
  notes?: string | null;
  created_at: string;
}

function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "completed">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [markingIds, setMarkingIds] = useState<number[]>([]);
  const [acceptingIds, setAcceptingIds] = useState<number[]>([]);
  const [rejectingIds, setRejectingIds] = useState<number[]>([]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Order[]>("/orders/", { auth: true });
      setOrders(data);
    } catch (error) {
      console.error("Fetch orders error:", error);
    } finally {
      await new Promise((r) => setTimeout(r, 400));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const markAsCompleted = async (orderId: number) => {
    if (markingIds.includes(orderId)) return;
    try {
      setMarkingIds((s) => [...s, orderId]);
      await apiFetch<Order>(`/orders/${orderId}`, {
        method: "PUT",
        auth: true,
        body: JSON.stringify({ status: "completed" }),
      });
      await fetchOrders();
    } finally {
      setMarkingIds((s) => s.filter((id) => id !== orderId));
    }
  };

  const acceptOrder = async (orderId: number) => {
    if (acceptingIds.includes(orderId)) return;
    try {
      setAcceptingIds((s) => [...s, orderId]);
      await apiFetch<Order>(`/orders/${orderId}`, {
        method: "PUT",
        auth: true,
        body: JSON.stringify({ status: "confirmed" }),
      });
      await fetchOrders();
      alert("Zakaz qabul qilindi. Tez orada yetkaziladi.");
    } catch (error) {
      console.error("Accept order error:", error);
      alert("Zakaz qabul qilishda xatolik.");
    } finally {
      setAcceptingIds((s) => s.filter((id) => id !== orderId));
    }
  };

  const rejectOrder = async (orderId: number) => {
    if (rejectingIds.includes(orderId)) return;
    const ok = window.confirm("Zakazni rad etmoqchimisiz?");
    if (!ok) return;
    try {
      setRejectingIds((s) => [...s, orderId]);
      await apiFetch<Order>(`/orders/${orderId}`, {
        method: "PUT",
        auth: true,
        body: JSON.stringify({ status: "rejected" }),
      });
      await fetchOrders();
      alert("Zakaz rad etildi.");
    } catch (error) {
      console.error("Reject order error:", error);
      alert("Zakazni rad etishda xatolik.");
    } finally {
      setRejectingIds((s) => s.filter((id) => id !== orderId));
    }
  };


  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    return order.status === filter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Box p={3}>
      <AdminHeader
        title="Orders"
        subtitle="Buyurtmalarni kuzatish va boshqarish"
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "completed", label: "Completed" },
            ].map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setFilter(btn.key as typeof filter)}
                className={`admin-hero__pill ${filter === btn.key ? "is-active" : ""}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        }
      />

      <Box sx={{ maxHeight: "70vh", overflowY: "auto", pr: 1 }}>
        {loading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
                <div className="admin-skeleton admin-skeleton-card" style={{ height: 260 }} />
              </Grid>
            ))}
          </Grid>
        ) : filteredOrders.length === 0 ? (
          <Typography align="center" color="text.secondary" fontSize={18}>
            No orders found
          </Typography>
        ) : (
          <>
            <Grid container spacing={3}>
              {paginatedOrders.map((order) => {
                const orderTotal = order.items?.reduce((sum, p) => sum + p.price * p.quantity, 0) || 0;
                const orderDate = new Date(order.created_at).toLocaleString();
                const canAccept = true;
                const coordMatch = order.notes?.match(/Lokatsiya:\s*([0-9.\-]+),\s*([0-9.\-]+)/);
                const mapUrl = coordMatch
                  ? `https://www.openstreetmap.org/?mlat=${coordMatch[1]}&mlon=${coordMatch[2]}#map=16/${coordMatch[1]}/${coordMatch[2]}`
                  : null;

                return (
                  <Grid key={order.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar>{String(order.user?.name || order.user?.email || "?").slice(0, 1)}</Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                Buyurtma bergan: {order.user?.name || order.user?.email || "Noma'lum"}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" fontSize={12}>
                                Order #{order.id}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip label={order.status.toUpperCase()} color={order.status === "completed" ? "success" : "warning"} />
                        </Box>

                        <Typography variant="body2" color="text.secondary" mb={1}>
                          Sana: {orderDate}
                        </Typography>
                        {order.delivery_address || order.phone || order.notes ? (
                          <Box mb={1}>
                            {order.delivery_address && (
                              <Typography variant="body2" color="text.secondary">
                                Manzil: {order.delivery_address}
                              </Typography>
                            )}
                            {order.phone && (
                              <Typography variant="body2" color="text.secondary">
                                Telefon: {order.phone}
                              </Typography>
                            )}
                            {order.notes && (
                              <Typography variant="body2" color="text.secondary">
                                Izoh: {order.notes}
                              </Typography>
                            )}
                            {mapUrl && (
                              <Typography variant="body2" color="text.secondary">
                                <a href={mapUrl} target="_blank" rel="noreferrer">
                                  Xaritada ko'rish
                                </a>
                              </Typography>
                            )}
                          </Box>
                        ) : null}

                        {order.items?.map((p) => (
                          <Box
                            key={p.id}
                            display="flex"
                            alignItems="center"
                            gap={2}
                            bgcolor="#f9f9f9"
                            p={1}
                            borderRadius={2}
                            mb={1}
                          >
                            {p.product?.image && (
                              <img
                                src={resolveImageUrl(p.product.image)}
                                alt={p.product.name}
                                style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 8 }}
                              />
                            )}
                            <Box>
                              <Typography variant="subtitle2">
                                {p.quantity}x {p.product?.name || `Product ${p.product_id}`}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {p.price} x {p.quantity}
                              </Typography>
                            </Box>
                          </Box>
                        ))}

                        <Typography variant="subtitle1" fontWeight="bold" mt={2} color="primary">
                          Umumiy summa: {orderTotal}
                        </Typography>

                        {order.status === "pending" && (
                          <Box mt={2} display="flex" gap={1}>
                            <Button
                              fullWidth
                              variant="contained"
                              color="primary"
                              onClick={() => acceptOrder(order.id)}
                            disabled={acceptingIds.includes(order.id)}
                            >
                              {acceptingIds.includes(order.id)
                                ? "Processing..."
                                : "Accept Order"}
                            </Button>
                            <Button
                              fullWidth
                              variant="contained"
                              color="error"
                              onClick={() => rejectOrder(order.id)}
                              disabled={rejectingIds.includes(order.id)}
                            >
                              {rejectingIds.includes(order.id) ? "Rejecting..." : "Reject"}
                            </Button>
                          </Box>
                        )}

                        {order.status === "confirmed" && (
                          <Button
                            fullWidth
                            sx={{ mt: 2 }}
                            variant="contained"
                            color="success"
                            onClick={() => markAsCompleted(order.id)}
                            disabled={markingIds.includes(order.id)}
                          >
                            {markingIds.includes(order.id) ? "Processing..." : "Mark as Completed"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, value) => setCurrentPage(value)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

export default Orders;

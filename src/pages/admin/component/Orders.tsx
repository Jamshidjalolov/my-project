import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./Firebase";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Grid,
  ButtonGroup,
} from "@mui/material";

function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const fetchOrders = async () => {
    setLoading(true);
    const ordersRef = collection(db, "orders");
    const snapshot = await getDocs(ordersRef);
    const ordersData: any[] = [];

    for (const orderDoc of snapshot.docs) {
      const orderData = orderDoc.data();
      const orderId = orderDoc.id;

      let user = null;
      if (orderData.userId) {
        const userSnap = await getDoc(doc(db, "users", orderData.userId));
        user = userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
      }

      const productsSnap = await getDocs(collection(db, "orders", orderId, "products"));
      const products = productsSnap.docs.map((p) => ({ id: p.id, ...p.data() }));

      ordersData.push({
        id: orderId,
        ...orderData,
        status: orderData.status || "pending",
        user,
        products,
      });
    }

    setOrders(ordersData);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const addOrder = async (userId: string, products: any[]) => {
    const newOrder = { userId, status: "pending", createdAt: serverTimestamp() };
    const orderRef = await addDoc(collection(db, "orders"), newOrder);
    for (const p of products) {
      await addDoc(collection(db, "orders", orderRef.id, "products"), p);
    }
    await fetchOrders();
  };

  const markAsCompleted = async (orderId: string) => {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { status: "completed" });
    await fetchOrders();
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    return order.status === filter;
  });

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3} fontWeight="bold">
        📦 Orders
      </Typography>

      <ButtonGroup variant="outlined" sx={{ mb: 3 }}>
        <Button
          onClick={() => setFilter("all")}
          variant={filter === "all" ? "contained" : "outlined"}
        >
          All
        </Button>
        <Button
          onClick={() => setFilter("pending")}
          variant={filter === "pending" ? "contained" : "outlined"}
          color="warning"
        >
          Pending
        </Button>
        <Button
          onClick={() => setFilter("completed")}
          variant={filter === "completed" ? "contained" : "outlined"}
          color="success"
        >
          Completed
        </Button>
      </ButtonGroup>

      <Box sx={{ maxHeight: "70vh", overflowY: "auto", pr: 1 }}>
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="50vh"
            flexDirection="column"
            gap={2}
          >
            <CircularProgress />
            <Typography>Loading orders...</Typography>
          </Box>
        ) : filteredOrders.length === 0 ? (
          <Typography align="center" color="text.secondary" fontSize={18}>
            ❌ No orders found
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {filteredOrders.map((order) => {
              const orderTotal =
                order.products?.reduce(
                  (sum: number, p: any) =>
                    sum + (p.quantity ? p.quantity * Number(p.narxi) : Number(p.narxi)),
                  0
                ) || 0;

              const avatarLetter = order.user?.email?.[0]?.toUpperCase() || "U";

              let orderDate = "No date";
              if (order.createdAt?.seconds) {
                orderDate = new Date(order.createdAt.seconds * 1000).toLocaleString();
              }

              return (
                <Grid item xs={12} sm={6} md={4} key={order.id}>
                  <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar>{avatarLetter}</Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {order.user?.email || "Unknown User"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontSize={12}>
                              Order #{order.id}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={order.status.toUpperCase()}
                          color={order.status === "completed" ? "success" : "warning"}
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" mb={1}>
                        Sana: {orderDate}
                      </Typography>

                      {order.products?.map((p: any, i: number) => {
                        let displayPrice: string | null = null;
                        let totalPrice: string | null = null;

                        if (p?.quantity > 1) {
                          displayPrice = `${Number(p.narxi).toLocaleString()} so‘m (1 dona)`;
                          totalPrice = `Jami: ${(p.quantity * Number(p.narxi)).toLocaleString()} so‘m`;
                        } else if (p?.quantity === 1) {
                          displayPrice = `${Number(p.narxi).toLocaleString()} so‘m`;
                        } else if (p?.narxi) {
                          displayPrice = `${Number(p.narxi).toLocaleString()} so‘m`;
                        }

                        return (
                          <Box
                            key={i}
                            display="flex"
                            alignItems="center"
                            gap={2}
                            bgcolor="#f9f9f9"
                            p={1}
                            borderRadius={2}
                            mb={1}
                          >
                            {p.image && (
                              <img
                                src={p.image}
                                alt={p.name}
                                style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 8 }}
                              />
                            )}
                            <Box>
                              <Typography variant="subtitle2">
                                {p.quantity}x {p.name}
                              </Typography>
                              {displayPrice && (
                                <Typography variant="body2" color="text.secondary">
                                  {displayPrice}
                                </Typography>
                              )}
                              {totalPrice && (
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  {totalPrice}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}

                      <Typography variant="subtitle1" fontWeight="bold" mt={2} color="primary">
                        Umumiy summa: {orderTotal.toLocaleString()} so‘m
                      </Typography>

                      {order.status !== "completed" && (
                        <Button fullWidth sx={{ mt: 2 }} variant="contained" color="success" onClick={() => markAsCompleted(order.id)}>
                          Mark as Completed
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Box>
  );
}

export default Orders;

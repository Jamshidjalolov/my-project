import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "./Firebase";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Product {
  id: string;
  name: string;
  narxi: number;
  keyingi_narx: number;
  discount?: number;
}

interface Order {
  id: string;
  status: string;
  userId?: string;
  products: { productId: string; quantity: number }[];
}

interface User {
  id: string;
  name: string;
  email: string;
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
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [soldStats, setSoldStats] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const fetchProducts = async () => {
      const querySnapshot = await getDocs(collection(db, "product"));
      const productsData: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productsData.push({
          id: doc.id,
          name: data.name,
          narxi: data.narxi || 0,
          keyingi_narx: data.keyingi_narx || 0,
          discount: data.discount || 0,
        });
      });
      setProducts(productsData);
    };

    const fetchOrders = async () => {
      const ordersCollection = collection(db, "orders");
      const querySnapshot = await getDocs(ordersCollection);
      const ordersData: Order[] = [];

      for (const docSnap of querySnapshot.docs) {
        const orderData = docSnap.data();
        const orderId = docSnap.id;

        const productsSnap = await getDocs(collection(db, "orders", orderId, "products"));
        const orderProducts: { productId: string; quantity: number }[] = [];
        productsSnap.forEach((pDoc) => {
          const pdata = pDoc.data();
          orderProducts.push({
            productId: pdata.productId,
            quantity: pdata.quantity || 1,
          });
        });

        ordersData.push({
          id: orderId,
          status: orderData.status,
          userId: orderData.userId,
          products: orderProducts,
        });
      }

      setOrders(ordersData);
    };

    fetchProducts();
    fetchOrders();
  }, []);

  useEffect(() => {
    const soldCounts: { [key: string]: number } = {};
    let revenue = 0;

    orders.forEach((order) => {
      if (order.status === "completed") {
        order.products.forEach((op) => {
          const product = products.find((p) => p.id === op.productId);
          if (product) {
            const discountPrice =
              product.narxi - (product.narxi * (product.discount || 0)) / 100;
            revenue += discountPrice * op.quantity;

            soldCounts[product.id] = (soldCounts[product.id] || 0) + op.quantity;
          }
        });
      }
    });

    setTotalRevenue(revenue);
    setSoldStats(soldCounts);
  }, [orders, products]);

  const chartData = Object.keys(soldStats).map((productId) => {
    const product = products.find((p) => p.id === productId);
    return {
      name: product ? product.name : productId,
      value: soldStats[productId],
    };
  });

  const top5Data = [...chartData].sort((a, b) => b.value - a.value).slice(0, 5);

  const statusStats: { [key: string]: number } = {};
  orders.forEach((o) => {
    statusStats[o.status] = (statusStats[o.status] || 0) + 1;
  });

  const statusData = Object.keys(statusStats).map((status) => ({
    name: status,
    value: statusStats[status],
  }));

  const activeOrders = orders.filter((o) => o.status === "pending").length;

  return (
    <Box sx={{ padding: "20px" }}>
      <Typography variant="h4" gutterBottom color="primary">
        Admin Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ backgroundColor: "#f5f5f5" }}>
            <CardContent>
              <Typography variant="h6">Total Revenue</Typography>
              <Typography variant="h4" color="success.main">
                {totalRevenue.toLocaleString()} sum
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ backgroundColor: "#f5f5f5" }}>
            <CardContent>
              <Typography variant="h6">Total Products</Typography>
              <Typography variant="h4">{products.length}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ backgroundColor: "#f5f5f5" }}>
            <CardContent>
              <Typography variant="h6">Active Orders</Typography>
              <Typography variant="h4" color="warning.main">
                {activeOrders}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h3">Sales Distribution</Typography>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label
                  >
                    {chartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5">Orders Status Distribution</Typography>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-status-${index}`}
                        fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h3">Top 5 Products</Typography>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={top5Data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {top5Data.map((_, index) => (
                      <Cell
                        key={`cell-top5-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
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

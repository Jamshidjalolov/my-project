import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../pages/admin/component/Firebase";

// Product interfeysi
export interface Product {
  id: string;
  name: string;
  narxi: number;
  quantity?: number;
  image?: string;
}

// User interfeysi
export interface User {
  id: string;
  email: string;
  name?: string;
}

// Order interfeysi
export interface Order {
  id: string;
  userId?: string;
  createdAt?: any;
  status?: string;
  user?: User | null;
  products: Product[];
}

// Custom hook
const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ordersRef = collection(db, "orders");

    // Real-time listener
    const unsubscribe = onSnapshot(ordersRef, async (snapshot) => {
      const results: Order[] = [];

      for (const orderDoc of snapshot.docs) {
        const orderData = orderDoc.data();
        const orderId = orderDoc.id;

        // 🔹 User ma'lumotini olish
        let user: User | null = null;
        if (orderData.userId) {
          const userSnap = await getDoc(doc(db, "users", orderData.userId));
          user = userSnap.exists() ? { id: userSnap.id, ...(userSnap.data() as any) } : null;
        }

        // 🔹 Products subcollectiondan olish
        const productsSnap = await getDocs(
          collection(db, "orders", orderId, "products")
        );
        const products: Product[] = productsSnap.docs.map((p) => ({
          id: p.id,
          ...(p.data() as any),
        }));

        results.push({
          id: orderId,
          ...orderData,
          status: orderData.status || "pending", // 🔹 default pending
          user,
          products,
        } as Order);
      }

      setOrders(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔹 Yangi order qo‘shish Firestore’ga pending bo‘lib saqlanadi
  const addOrder = async (userId: string, products: Product[]) => {
    try {
      const newOrder = {
        userId,
        status: "pending",
        createdAt: serverTimestamp(),
      };

      const orderRef = await addDoc(collection(db, "orders"), newOrder);

      for (const p of products) {
        await addDoc(collection(db, "orders", orderRef.id, "products"), p);
      }
    } catch (err) {
      console.error("❌ Order qo‘shishda xatolik:", err);
    }
  };

  return { orders, loading, addOrder };
};

export default useOrders;

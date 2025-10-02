import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../pages/admin/component/Firebase";
import { getAuth } from "firebase/auth";

interface CartItem {
  id: string;
  name: string;
  narxi: number | string;
  keyingi_narx?: number | string;
  image: string;
  quantity: number;
}

function useShop() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "buy"), (snapshot) => {
      const data: CartItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as CartItem),
      }));
      setCart(data);
    });
    return () => unsub();
  }, []);

  const increment = async (item: CartItem) => {
    const ref = doc(db, "buy", item.id);
    await updateDoc(ref, {
      quantity: (item.quantity || 1) + 1,
    });
  };

  const decrement = async (item: CartItem) => {
    if (item.quantity > 1) {
      const ref = doc(db, "buy", item.id);
      await updateDoc(ref, {
        quantity: item.quantity - 1,
      });
    } else {
      await deleteDoc(doc(db, "buy", item.id));
    }
  };

  const removeItem = async (id: string) => {
    await deleteDoc(doc(db, "buy", id));
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => {
      const price = Number(item.keyingi_narx || item.narxi) || 0;
      return acc + price * (item.quantity || 1);
    }, 0);
  };

  const placeOrder = async () => {
    if (!auth.currentUser) {
      alert("Iltimos, avval tizimga kiring!");
      return;
    }

    const userId = auth.currentUser.uid;

    try {
      const orderRef = await addDoc(collection(db, "orders"), {
        userId,
        status: "pending", // default pending
        createdAt: serverTimestamp(),
      });

      await Promise.all(
        cart.map(async (item) => {
          await addDoc(collection(db, "orders", orderRef.id, "products"), {
            ...item,
            createdAt: serverTimestamp(),
          });

          // 🔹 Savatchadan o‘chirish
          await deleteDoc(doc(db, "buy", item.id));
        })
      );

      alert("Buyurtmangiz yuborildi! ✅");
    } catch (err) {
      console.error("Buyurtma yuborishda xatolik:", err);
      alert("Xatolik yuz berdi! ❌");
    }
  };

  // 🔹 UI
  if (cart.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <h2>Savatcha bo‘sh 🛒</h2>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "20px",
            background: "red",
            color: "#fff",
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Xarid qilishni boshlash
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "30px" }}>
      <h2 style={{ marginBottom: "20px" }}>🛒 Savatcha</h2>

      {cart.map((item) => {
        const price = Number(item.keyingi_narx || item.narxi) || 0;
        const total = price * (item.quantity || 1);

        return (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "10px",
              marginBottom: "15px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <img
                src={item.image}
                alt={item.name}
                style={{
                  width: "70px",
                  height: "70px",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
              />
              <div>
                <h3>{item.name}</h3>
                <p>
                  {item.keyingi_narx ? (
                    <>
                      <span style={{ textDecoration: "line-through" }}>
                        {Number(item.narxi).toLocaleString()} so‘m
                      </span>{" "}
                      <span style={{ color: "red", fontWeight: "bold" }}>
                        {Number(item.keyingi_narx).toLocaleString()} so‘m
                      </span>
                    </>
                  ) : (
                    <span>{Number(item.narxi).toLocaleString()} so‘m</span>
                  )}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={() => decrement(item)}
                    style={{
                      background: "red",
                      color: "#fff",
                      border: "none",
                      padding: "5px 10px",
                      cursor: "pointer",
                      borderRadius: "5px",
                    }}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => increment(item)}
                    style={{
                      background: "red",
                      color: "#fff",
                      border: "none",
                      padding: "5px 10px",
                      cursor: "pointer",
                      borderRadius: "5px",
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <p>
                <b>{total.toLocaleString()} so‘m</b>
              </p>
              <button
                onClick={() => removeItem(item.id)}
                style={{
                  marginTop: "5px",
                  background: "#aaa",
                  color: "#fff",
                  padding: "5px 10px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                O‘chirish
              </button>
            </div>
          </div>
        );
      })}

      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <h3>Umumiy summa:</h3>
        <p style={{ fontSize: "20px", fontWeight: "bold", color: "green" }}>
          {calculateTotal().toLocaleString()} so‘m
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "15px",
            background: "red",
            color: "#fff",
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Xaridni davom ettirish
        </button>
        <button
          onClick={placeOrder}
          style={{
            marginLeft: "10px",
            marginTop: "15px",
            background: "green",
            color: "#fff",
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          ✅ Orders
        </button>
      </div>
    </div>
  );
}

export default useShop;

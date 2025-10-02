import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { db } from "../pages/admin/component/Firebase";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  narxi: number;
  keyingi_narx?: number;
  image: string;
  categoryId: string;
}

interface Rating {
  productId: string;
  value: number;
}

interface Props {
  selectedCategory: string;
}

function Kard({ selectedCategory }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; product: Product | null; goToCart?: boolean }>({
    show: false,
    product: null,
    goToCart: false,
  });
  const [isLoading, setIsLoading] = useState(false); // Savat uchun
  const [isProductsLoading, setIsProductsLoading] = useState(true); // Mahsulotlarni olish uchun

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        setIsProductsLoading(true);
        let q;
        if (selectedCategory === "all") {
          q = collection(db, "product");
        } else {
          q = query(collection(db, "product"), where("category", "==", selectedCategory));
        }

        const querySnapshot = await getDocs(q);
        const data: Product[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Product),
        }));
        setProducts(data);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setIsProductsLoading(false);
      }
    }
    fetchData();
  }, [selectedCategory]);

  useEffect(() => {
    async function fetchCart() {
      try {
        const snapshot = await getDocs(collection(db, "buy"));
        const ids = snapshot.docs.map((doc) => (doc.data() as any).productId);
        setCartItems(ids);
      } catch (err) {
        console.error("Error fetching cart:", err);
      }
    }
    fetchCart();
  }, []);

  useEffect(() => {
    async function fetchRatings() {
      try {
        const snapshot = await getDocs(collection(db, "ratings"));
        const data: Rating[] = snapshot.docs.map((doc) => doc.data() as Rating);
        setRatings(data);
      } catch (err) {
        console.error("Error fetching ratings:", err);
      }
    }
    fetchRatings();
  }, []);

  const handleRating = async (productId: string, value: number) => {
    try {
      await addDoc(collection(db, "ratings"), { productId, value, createdAt: new Date() });
      setRatings((prev) => [...prev, { productId, value }]);
      alert(`Siz ${value} ⭐ baho berdingiz`);
    } catch (err) {
      console.error("Error saving rating:", err);
    }
  };

  const getAverageRating = (productId: string) => {
    const productRatings = ratings.filter((r) => r.productId === productId);
    if (productRatings.length === 0) return 0;
    const sum = productRatings.reduce((acc, r) => acc + r.value, 0);
    return sum / productRatings.length;
  };

  const handleBuyNow = (product: Product) => {
    if (cartItems.includes(product.id)) {
      setConfirmModal({ show: true, product, goToCart: true });
    } else {
      setConfirmModal({ show: true, product, goToCart: false });
    }
  };

  const confirmPurchase = async () => {
    if (!confirmModal.product) return;
    const product = confirmModal.product;

    try {
      setIsLoading(true);

      if (confirmModal.goToCart) {
        navigate("/cart");
      } else {
        await addDoc(collection(db, "buy"), {
          productId: product.id,
          name: product.name,
          narxi: Number(product.narxi),
          keyingi_narx: product.keyingi_narx ? Number(product.keyingi_narx) : null,
          image: product.image,
          createdAt: new Date(),
          count: 1,
        });
        setCartItems((prev) => [...prev, product.id]);
        alert(`${product.name} savatga qo'shildi ✅`);
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert("Xatolik yuz berdi, iltimos qayta urinib ko‘ring");
    } finally {
      setIsLoading(false);
      setConfirmModal({ show: false, product: null });
    }
  };

  const cancelPurchase = () => {
    if (isLoading) return;
    setConfirmModal({ show: false, product: null });
  };

  if (isProductsLoading) {
    return (
      <div
        style={{
          width: "100%",
          height: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            border: "5px solid #f3f3f3",
            borderTop: "5px solid #E21A43",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        ></div>

        <style>
          {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          `}
        </style>
      </div>
    );
  }

  return (
    <div
      className="product-row"
      style={{
        display: "flex",
        gap: "15px",
        overflowX: "auto",
        padding: "10px",
      }}
    >
      {products.map((product) => {
        const avgRating = getAverageRating(product.id);
        return (
          <div
            key={product.id}
            className="product-card"
            style={{
              border: "1px solid #ddd",
              padding: "10px",
              borderRadius: "10px",
              width: "220px",
              minWidth: "220px",
              textAlign: "center",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-5px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0px 6px 15px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <img
              src={product.image}
              alt={product.name}
              style={{
                width: "120px",
                height: "110px",
                objectFit: "cover",
                borderRadius: "8px",
              }}
            />
            <h3>{product.name}</h3>
            <p>
              {product.keyingi_narx ? (
                <>
                  <span style={{ textDecoration: "line-through", marginRight: "8px" }}>
                    ${product.narxi}
                  </span>
                  <span style={{ color: "red" }}>${product.keyingi_narx}</span>
                </>
              ) : (
                <>${product.narxi}</>
              )}
            </p>

            <div style={{ margin: "10px 0" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => handleRating(product.id, star)}
                  style={{
                    cursor: "pointer",
                    fontSize: "20px",
                    color: star <= avgRating ? "gold" : "#ccc",
                  }}
                >
                  ★
                </span>
              ))}
              <div style={{ fontSize: "12px", color: "#555" }}>
                O‘rtacha baho: {avgRating.toFixed(1)} ⭐
              </div>
            </div>

            <button
              onClick={() => handleBuyNow(product)}
              style={{
                background: cartItems.includes(product.id) ? "#007bff" : "#E21A43",
                color: "white",
                padding: "8px 15px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
              }}
            >
              {cartItems.includes(product.id) ? "Go to Cart" : "Buy Now"}
            </button>
          </div>
        );
      })}

      {confirmModal.show && confirmModal.product && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              width: "350px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            <h2>
              {confirmModal.goToCart
                ? "Savatga o'tmoqchimisiz?"
                : ` ${confirmModal.product.name} sotib olmoqchimisiz?`}
            </h2>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <button
                onClick={confirmPurchase}
                disabled={isLoading}
                style={{
                  padding: "8px 15px",
                  background: isLoading ? "#aaa" : "#4caf50",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {isLoading ? (
                  <>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid #fff",
                        borderTop: "2px solid transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    ></div>
                    Iltimos kuting...
                  </>
                ) : (
                  "Ha"
                )}
              </button>
              <button
                onClick={cancelPurchase}
                disabled={isLoading}
                style={{
                  padding: "8px 15px",
                  background: "#f44336",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                Yo‘q
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        `}
      </style>
    </div>
  );
}

export default Kard;

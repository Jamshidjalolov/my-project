import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuthRole } from "../hooks/useAuthRole";

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product?: { id: number; name: string; image?: string | null };
}

interface Order {
  id: number;
  status: string;
  created_at: string;
  items: OrderItem[];
  notes?: string | null;
}

function Notifications() {
  const { user, loading } = useAuthRole();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const list = await apiFetch<Order[]>("/orders/", { auth: true });
        setOrders(list);
      } catch (error) {
        console.error("Orders fetch error:", error);
      }
    };
    load();
  }, [user]);

  const sorted = useMemo(
    () => orders.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [orders]
  );

  if (!user) return null;

  return (
    <section className="notify-page">
      <div className="notify-page__header">
        <div>
          <h2>Zakaz tarixi</h2>
          <p>Qabul qilingan, rad etilgan va kutilayotgan zakazlaringiz</p>
        </div>
        <button className="btn-outline" type="button" onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="notify-empty">Hozircha zakaz yo'q</div>
      ) : (
        <div className="notify-grid">
          {sorted.map((order) => (
            <div className={`notify-card status-${order.status}`} key={order.id}>
              <div className="notify-card__head">
                <strong>Zakaz #{order.id}</strong>
                <span className="notify-status">
                  {order.status === "confirmed"
                    ? "Qabul qilindi — tez orada yetkaziladi"
                    : order.status === "rejected"
                    ? "Rad etildi"
                    : order.status === "completed"
                    ? "Yetkazildi"
                    : order.status === "cancelled"
                    ? "Bekor qilindi"
                    : "Kutilmoqda"}
                </span>
              </div>
              <div className="notify-date">
                {new Date(order.created_at).toLocaleString()}
              </div>
              <div className="notify-items">
                {order.items.map((item) => (
                  <div key={item.id} className="notify-item">
                    <div>
                      <div className="notify-item__name">
                        {item.product?.name || "Mahsulot"}
                      </div>
                      <div className="notify-item__qty">
                        {item.quantity} x {item.price}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {order.notes && <div className="notify-notes">{order.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Notifications;

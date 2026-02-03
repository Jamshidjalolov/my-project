import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthRole } from "./useAuthRole";
import { apiFetch } from "../lib/api";
import { clearCart, getCart, removeCartItem, subscribeCart, updateCartItem } from "../lib/cart";

interface CartItem {
  product_id: number;
  name: string;
  price: number;
  discount_price?: number | null;
  image?: string | null;
  quantity: number;
}

declare global {
  interface Window {
    L?: any;
  }
}

function Cart() {
  const [cart, setCartState] = useState<CartItem[]>([]);
  const navigate = useNavigate();
  const { user, loading } = useAuthRole();
  const [delivery, setDelivery] = useState({
    phone: "",
    notes: "",
  });
  const [orderType, setOrderType] = useState<"pickup" | "delivery">("delivery");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [deliveryType, setDeliveryType] = useState<string>("");
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [showStaticMap, setShowStaticMap] = useState(false);
  const [staticZoom, setStaticZoom] = useState(13);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const markerRef = useRef<any | null>(null);
  const tileLoadedRef = useRef(false);
  const STORE_COORDS = { lat: 39.7747, lng: 64.4286 };

  useEffect(() => {
    const sync = () => setCartState(getCart());
    sync();
    const unsubscribe = subscribeCart(sync);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;
    const loadLeaflet = () =>
      new Promise<any>((resolve) => {
        if (window.L) {
          resolve(window.L);
          return;
        }

        const existingScript = document.querySelector<HTMLScriptElement>("script[data-leaflet]");
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(window.L));
          return;
        }

        const link = document.querySelector<HTMLLinkElement>("link[data-leaflet]");
        if (!link) {
          const css = document.createElement("link");
          css.rel = "stylesheet";
          css.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
          css.crossOrigin = "";
          css.setAttribute("data-leaflet", "true");
          document.head.appendChild(css);
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
        script.crossOrigin = "";
        script.defer = true;
        script.setAttribute("data-leaflet", "true");
        script.addEventListener("load", () => resolve(window.L));
        script.addEventListener("error", () => {
          const fallback = document.createElement("script");
          fallback.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          fallback.crossOrigin = "";
          fallback.defer = true;
          fallback.setAttribute("data-leaflet", "true");
          fallback.addEventListener("load", () => resolve(window.L));
          document.body.appendChild(fallback);
        });
        document.body.appendChild(script);
      });

    let cleanup = () => {};

    loadLeaflet().then((L: any) => {
      if (!mapRef.current || mapInstanceRef.current) return;
      setMapStatus("loading");
      const map = L.map(mapRef.current, {
        zoomControl: true,
        preferCanvas: true,
        zoomSnap: 1,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
        dragging: true,
      }).setView([STORE_COORDS.lat, STORE_COORDS.lng], 12);
      mapInstanceRef.current = map;
      tileLoadedRef.current = false;
      setMapStatus("loading");

      const tileProviders = [
        {
          name: "esri-street",
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
          attribution: "&copy; Esri & OpenStreetMap contributors",
          subdomains: "",
          maxZoom: 19,
        },
        {
          name: "google-road",
          url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
          attribution: "&copy; Google Maps",
          subdomains: "",
          maxZoom: 20,
        },
        {
          name: "google-sat",
          url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
          attribution: "&copy; Google Maps",
          subdomains: "",
          maxZoom: 20,
        },
        {
          name: "carto-light",
          url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        },
        {
          name: "osm-de",
          url: "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
          attribution: "&copy; OpenStreetMap contributors",
          subdomains: "abc",
          maxZoom: 19,
        },
        {
          name: "wikimedia",
          url: "https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png",
          attribution: "&copy; OpenStreetMap contributors",
          subdomains: "abc",
          maxZoom: 19,
        },
        {
          name: "osm-standard",
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          attribution: "&copy; OpenStreetMap contributors",
          subdomains: "abc",
          maxZoom: 19,
        },
        {
          name: "osm-hot",
          url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
          attribution: "&copy; OpenStreetMap contributors",
          subdomains: "abc",
          maxZoom: 19,
        },
      ];

      let providerIndex = 0;
      let tileErrorCount = 0;
      let activeLayer: any | null = null;

      const mountLayer = (idx: number) => {
        const provider = tileProviders[idx];
        if (!provider) return;
        if (activeLayer) {
          activeLayer.off("tileload", handleTileLoad);
          activeLayer.off("tileerror", handleTileError);
          map.removeLayer(activeLayer);
        }
        activeLayer = L.tileLayer(provider.url, {
          attribution: provider.attribution,
          detectRetina: true,
          maxZoom: provider.maxZoom,
          updateWhenIdle: true,
          updateWhenZooming: false,
          keepBuffer: 1,
          subdomains: provider.subdomains || undefined,
        });
        activeLayer.on("tileload", handleTileLoad);
        activeLayer.on("tileerror", handleTileError);
        activeLayer.addTo(map);
      };

      const handleTileLoad = () => {
        tileLoadedRef.current = true;
        tileErrorCount = 0;
        setMapStatus("ready");
      };

      const handleTileError = () => {
        tileErrorCount += 1;
        if (tileErrorCount < 3) return;
        providerIndex += 1;
        tileErrorCount = 0;
        if (providerIndex < tileProviders.length) {
          mountLayer(providerIndex);
        } else {
          setMapStatus("failed");
        }
      };

      mountLayer(providerIndex);

      const storeMarker = L.marker([STORE_COORDS.lat, STORE_COORDS.lng]).addTo(map);
      storeMarker.bindPopup("Magazin joyi");
      const resizeObserver =
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver(() => map.invalidateSize())
          : null;
      if (resizeObserver && mapRef.current) {
        resizeObserver.observe(mapRef.current);
      }

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        setCoords({ lat, lng });
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
          markerRef.current.on("dragend", (evt: any) => {
            const pos = evt.target.getLatLng();
            setCoords({ lat: pos.lat, lng: pos.lng });
          });
        }
      });

      map.whenReady(() => {
        setTimeout(() => map.invalidateSize(), 200);
        setTimeout(() => map.invalidateSize(), 800);
        setTimeout(() => {
          if (!tileLoadedRef.current) {
            setMapStatus("ready");
          }
        }, 2000);
      });
      cleanup = () => {
        if (resizeObserver && mapRef.current) {
          resizeObserver.unobserve(mapRef.current);
        }
        if (activeLayer) {
          activeLayer.off("tileload", handleTileLoad);
          activeLayer.off("tileerror", handleTileError);
        }
        map.removeLayer(storeMarker);
        map.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      };
    });

    const failTimer = setTimeout(() => {
      if (!mapInstanceRef.current) {
        setMapStatus("failed");
      }
    }, 3000);
    const tileFailTimer = setTimeout(() => {
      if (!tileLoadedRef.current) {
        setMapStatus("failed");
      }
    }, 6000);

    return () => {
      clearTimeout(failTimer);
      clearTimeout(tileFailTimer);
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (mapStatus === "loading") {
      const timer = setTimeout(() => {
        setShowStaticMap(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
    if (mapStatus === "ready") {
      setShowStaticMap(false);
    }
    if (mapStatus === "failed") {
      setShowStaticMap(true);
    }
  }, [mapStatus]);

  const centerTo = (lat: number, lng: number, zoom = 15) => {
    const L = window.L;
    if (!mapInstanceRef.current || !L) return;
    mapInstanceRef.current.setView([lat, lng], zoom);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current);
      markerRef.current.on("dragend", (evt: any) => {
        const pos = evt.target.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
      });
    }
  };

  const calcDistanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  useEffect(() => {
    if (!coords) {
      setDeliveryType("");
      setDeliveryDistance(null);
      return;
    }
    const km = calcDistanceKm(STORE_COORDS, coords);
    setDeliveryDistance(km);
    if (km <= 2) setDeliveryType("velo");
    else if (km <= 5) setDeliveryType("scooter");
    else if (km <= 15) setDeliveryType("car");
    else setDeliveryType("out");
  }, [coords]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolokatsiya brauzeringizda yoq.");
      return;
    }
    if (!window.isSecureContext && location.hostname !== "localhost") {
      alert("Geolokatsiya uchun HTTPS kerak. localhost yoki https ishlating.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        centerTo(latitude, longitude, 16);
      },
      (err) => {
        if (err.code === 1) {
          alert("Joylashuv ruxsati berilmadi.");
        } else if (err.code === 2) {
          alert("Joylashuv aniqlanmadi. GPS yoki internetni tekshiring.");
        } else if (err.code === 3) {
          alert("Joylashuv so'rovi vaqt tugadi.");
        } else {
          alert("Joylashuvni olishda xatolik.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&addressdetails=1&limit=5`;
      const res = await fetch(url, { headers: { "Accept-Language": "uz" } });
      const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
      setSearchResults(data);
      if (data.length === 1) {
        const item = data[0];
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        setCoords({ lat, lng });
        centerTo(lat, lng);
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Qidirishda xatolik.");
    } finally {
      setSearching(false);
    }
  };

  const increment = async (item: CartItem) => {
    updateCartItem(item.product_id, (item.quantity || 1) + 1);
    setCartState(getCart());
  };

  const decrement = async (item: CartItem) => {
    if (item.quantity > 1) {
      updateCartItem(item.product_id, item.quantity - 1);
    } else {
      removeCartItem(item.product_id);
    }
    setCartState(getCart());
  };

  const removeItem = async (id: number) => {
    const ok = window.confirm("Haqiqatan ham o‘chirmoqchimisiz?");
    if (!ok) return;
    removeCartItem(id);
    setCartState(getCart());
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => {
      const price = Number(item.discount_price ?? item.price) || 0;
      return acc + price * (item.quantity || 1);
    }, 0);
  };

  // Buyurtma berish: foydalanuvchi login bo'lmasa ro'yxatdan o'tishga yuboramiz.
  const placeOrder = async () => {
    if (loading) return;
    if (!user) {
      alert("Buyurtma berish uchun avval ro'yxatdan o'ting yoki tizimga kiring!");
      navigate("/register", { state: { from: { pathname: "/cart" } } });
      return;
    }
    if (orderType === "delivery") {
      if (!coords) {
        alert("Iltimos, xaritadan yetkazib berish joyini belgilang.");
        return;
      }
      if (!/^\+998\d{9}$/.test(delivery.phone)) {
        alert("Telefon raqam +998XXXXXXXXX ko'rinishida bo'lishi shart.");
        return;
      }
    }

    try {
      const locationNote =
        orderType === "delivery" && coords
          ? `Lokatsiya: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
          : "";
      const deliveryNote =
        orderType === "delivery" && deliveryType && deliveryDistance !== null
          ? `Yetkazish: ${deliveryType} (${deliveryDistance.toFixed(2)}km)`
          : "";
      const mergedNotes = [delivery.notes, locationNote, deliveryNote]
        .filter(Boolean)
        .join(" | ");
      await apiFetch("/orders/", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          items: cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          phone: orderType === "delivery" ? delivery.phone || null : null,
          notes: mergedNotes || null,
        }),
      });

      clearCart();
      setCartState([]);
      setDelivery({ phone: "", notes: "" });
      setCoords(null);
      setDeliveryType("");
      setDeliveryDistance(null);
      alert("Buyurtmangiz yuborildi!");
    } catch (err) {
      console.error("Buyurtma yuborishda xatolik:", err);
      alert("Xatolik yuz berdi!");
    }
  };

  if (cart.length === 0) {
    return (
      <section className="cart-page">
        <div className="cart-empty">
          <h2>Savatcha bo'sh</h2>
          <p>Yoqimli taomlar kutmoqda. Xaridni boshlang.</p>
          <button className="btn-primary" type="button" onClick={() => navigate("/")}>
            Xarid qilishni boshlash
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <div className="cart-header">
        <h2>Savatcha</h2>
        <button className="btn-outline" type="button" onClick={() => navigate("/")}>
          Xaridni davom ettirish
        </button>
      </div>

      <div className="cart-list">
        {cart.map((item) => {
          const price = Number(item.discount_price ?? item.price) || 0;
          const total = price * (item.quantity || 1);

          return (
            <div key={item.product_id} className="cart-item">
              <div className="cart-info">
                {item.image ? (
                  <img src={item.image} alt={item.name} />
                ) : (
                  <div className="cart-placeholder" />
                )}
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    {item.discount_price ? (
                      <>
                        <span className="price-old">{Number(item.price).toLocaleString()} so'm</span>{" "}
                        <span className="price-new">
                          {Number(item.discount_price).toLocaleString()} so'm
                        </span>
                      </>
                    ) : (
                      <span>{Number(item.price).toLocaleString()} so'm</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="cart-qty">
                <button type="button" onClick={() => decrement(item)}>
                  -
                </button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => increment(item)}>
                  +
                </button>
              </div>

              <div className="cart-total">
                <strong>{total.toLocaleString()} so'm</strong>
                <button type="button" onClick={() => removeItem(item.product_id)}>
                  O'chirish
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cart-summary">
        <div>
          <h3>Umumiy summa</h3>
          <p>{calculateTotal().toLocaleString()} so'm</p>
        </div>
      </div>
      <div className="cart-delivery">
        <h3>Yetkazib berish ma'lumotlari</h3>
        <div className="cart-delivery__grid">
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as "pickup" | "delivery")}
          >
            <option value="delivery">Yetkazib berish</option>
            <option value="pickup">Oddiy buyurtma (o'zim olaman)</option>
          </select>
        </div>
        <div className="cart-delivery__grid">
          {orderType === "delivery" && (
            <input
              type="tel"
              placeholder="+998901234567"
              value={delivery.phone}
              onChange={(e) => setDelivery((prev) => ({ ...prev, phone: e.target.value }))}
              required
              pattern="\\+998\\d{9}"
            />
          )}
          <textarea
            placeholder="Izoh (ixtiyoriy)"
            value={delivery.notes}
            onChange={(e) => setDelivery((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>
        {orderType === "delivery" && (
        <div className="cart-map">
          <div className="cart-map__header">
            <span>Xaritadan belgilang</span>
            {coords && (
              <span className="cart-map__coords">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            )}
          </div>
          <div className="cart-map__tools">
            <button type="button" className="btn-outline" onClick={useMyLocation}>
              Mening joyim
            </button>
            <div className="cart-map__search">
              <input
                type="text"
                placeholder="Manzil qidiring..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <button type="button" className="btn-primary" onClick={handleSearch} disabled={searching}>
                {searching ? "..." : "Qidirish"}
              </button>
            </div>
          </div>
          {searchResults.length > 1 && (
            <div className="cart-map__results">
              {searchResults.map((item, idx) => (
                <button
                  key={`${item.lat}-${item.lon}-${idx}`}
                  type="button"
                  onClick={() => {
                    const lat = Number(item.lat);
                    const lng = Number(item.lon);
                    setCoords({ lat, lng });
                    centerTo(lat, lng);
                  }}
                >
                  {item.display_name}
                </button>
              ))}
            </div>
          )}
          <div className="cart-delivery__type">
            <div>
              <strong>Yetkazib berish turi:</strong>{" "}
              {deliveryType === "out"
                ? "Hududdan tashqari"
                : deliveryType
                ? deliveryType
                : "Tanlanmadi"}
            </div>
            {deliveryDistance !== null && (
              <div className="cart-delivery__distance">
                Masofa: {deliveryDistance.toFixed(2)} km
              </div>
            )}
            {deliveryType === "out" && (
              <div className="cart-delivery__warn">
                15km dan uzoq joyga yetkazib berilmaydi.
              </div>
            )}
          </div>
          <div ref={mapRef} className="cart-map__view" style={{ height: 280 }}>
            {showStaticMap && (
              <div className="cart-map__fallback">
                <div>Xarita yuklanmadi. Qidiruv yoki “Mening joyim” orqali belgilang.</div>
                <img
                  src={`https://static-maps.yandex.ru/1.x/?lang=uz_UZ&ll=${
                    (coords ? coords.lng : STORE_COORDS.lng).toFixed(6)
                  },${(coords ? coords.lat : STORE_COORDS.lat).toFixed(6)}&z=${staticZoom}&size=600,280&l=map&pt=${
                    (coords ? coords.lng : STORE_COORDS.lng).toFixed(6)
                  },${(coords ? coords.lat : STORE_COORDS.lat).toFixed(6)},pm2rdm`}
                  alt="Static map"
                />
                <div className="cart-map__zoom cart-map__zoom--corner">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setStaticZoom((z) => Math.min(17, z + 1))}
                  >
                    +
                  </button>
                  <span>Zoom: {staticZoom}</span>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setStaticZoom((z) => Math.max(8, z - 1))}
                  >
                    -
                  </button>
                </div>
                <button type="button" className="btn-outline" onClick={() => setShowStaticMap(false)}>
                  Jonli xaritani qayta ochish
                </button>
              </div>
            )}
            {mapStatus === "loading" && !showStaticMap && (
              <div className="cart-map__loading">Xarita yuklanmoqda...</div>
            )}
          </div>
        </div>
        )}
      </div>
      <div className="cart-summary cart-summary--bottom">
        <div>
          <h3>Umumiy summa</h3>
          <p>{calculateTotal().toLocaleString()} so'm</p>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={placeOrder}
          disabled={orderType === "delivery" ? deliveryType === "out" || !coords : false}
        >
          Buyurtma berish
        </button>
      </div>
    </section>
  );
}

export default Cart;

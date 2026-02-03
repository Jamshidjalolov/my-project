import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Kard from "../components/Kard";
import { apiFetch, resolveImageUrl } from "../lib/api";
import { addToCart, getCart, subscribeCart } from "../lib/cart";

interface Category {
  id: number;
  name: string;
}

interface Main7Item {
  id: number;
  name: string;
  description?: string;
  old_price?: string;
  new_price?: string;
  img?: string;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  discount_price?: number | null;
  image?: string | null;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const scoreMatch = (a: string, b: string) => {
  const aTokens = normalize(a).split(" ").filter(Boolean);
  const bTokens = normalize(b).split(" ").filter(Boolean);
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  let hit = 0;
  aSet.forEach((t) => {
    if (bSet.has(t)) hit += 1;
  });
  const denom = Math.max(aSet.size, bSet.size);
  return hit / denom;
};

function Main7() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Main7Item[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dealSeconds, setDealSeconds] = useState<number>(0);
  const [dealIndex, setDealIndex] = useState(0);
  const [cartItems, setCartItems] = useState<number[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await apiFetch<Category[]>("/categories/");
        setCategories(data);
      } catch (error) {
        console.error("Categories fetch error:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const sync = () => {
      const cart = getCart();
      setCartItems(cart.map((item) => item.product_id));
    };
    sync();
    const unsubscribe = subscribeCart(sync);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await apiFetch<Main7Item[]>("/main7/");
        setItems(data);
        if (data.length > 0) {
          setDealIndex(0);
          const first = data[0];
          const total =
            (first.day || 0) * 86400 +
            (first.hour || 0) * 3600 +
            (first.minute || 0) * 60 +
            (first.second || 0);
          setDealSeconds(total);
        }
      } catch (error) {
        console.error("Main7 fetch error:", error);
      }
    };
    fetchItems();
  }, []);

  useEffect(() => {
    if (dealSeconds <= 0) return;
    const timer = setInterval(() => {
      setDealSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [dealSeconds]);

  useEffect(() => {
    if (dealSeconds > 0) return;
    if (items.length <= 1) return;
    const nextIndex = (dealIndex + 1) % items.length;
    const next = items[nextIndex];
    const total =
      (next.day || 0) * 86400 +
      (next.hour || 0) * 3600 +
      (next.minute || 0) * 60 +
      (next.second || 0);
    setDealIndex(nextIndex);
    setDealSeconds(total);
  }, [dealSeconds, dealIndex, items]);

  const formatTime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return { d, h, m, s };
  };

  const isDealActive = dealSeconds > 0;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const list = await apiFetch<Product[]>("/products/");
        setProducts(list);
      } catch (error) {
        console.error("Products fetch error:", error);
      }
    };
    fetchProducts();
  }, []);

  const featuredProduct = useMemo(() => {
    if (items.length === 0 || products.length === 0) return null;
    const item = items[dealIndex] ?? items[0];
    const exact = products.find(
      (p) => normalize(p.name) === normalize(item.name)
    );
    if (exact) return exact;
    let best: Product | null = null;
    let bestScore = 0;
    for (const product of products) {
      const score = scoreMatch(product.name, item.name);
      if (score > bestScore) {
        bestScore = score;
        best = product;
      }
    }
    return bestScore >= 0.2 ? best : null;
  }, [items, products, dealIndex]);

  const handleDealAdd = () => {
    if (!featuredProduct) return;
    if (cartItems.includes(featuredProduct.id)) {
      navigate("/cart");
      return;
    }
    addToCart({
      product_id: featuredProduct.id,
      name: featuredProduct.name,
      price: featuredProduct.price,
      discount_price: featuredProduct.discount_price ?? null,
      image: featuredProduct.image ?? null,
      quantity: 1,
    });
  };

  return (
    <section className="main7" id="deals">
      <div className="cards">
        {items.slice(dealIndex, dealIndex + 1).map((p) => (
          <div className="cardcha" key={p.id}>
            <div className="img">
              {p.img && <img src={resolveImageUrl(p.img)} alt={p.name} />}
            </div>

            <div className="btn1">
              {isDealActive ? (
                <>
                  <button type="button">
                    {formatTime(dealSeconds).d} <br /> day
                  </button>
                  <button type="button">{formatTime(dealSeconds).h} hour</button>
                  <button type="button">
                    {formatTime(dealSeconds).m} <br /> min
                  </button>
                  <button type="button">
                    {formatTime(dealSeconds).s} <br /> sec
                  </button>
                </>
              ) : (
                <button type="button">Combo tugadi</button>
              )}
            </div>

            <h1>{p.name}</h1>
            <p>{p.description}</p>

            <h3>
              {isDealActive && p.old_price ? p.old_price : null}{" "}
              <span className="price-new">{p.new_price || p.old_price}</span>
            </h3>

            <div className="btn3">
              <button className="deal-cta" type="button" onClick={handleDealAdd} disabled={!isDealActive}>
                {!isDealActive
                  ? "Combo tugadi"
                  : !featuredProduct
                  ? "Combo topilmadi"
                  : cartItems.includes(featuredProduct?.id ?? -1)
                  ? "Go to cart"
                  : "Add to bag"}
              </button>
              <a className="deal-plus" href="#shop" aria-label="See products">
                +
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="boxx" id="shop">
        <h2>--Best Selling Product--</h2>
        <ul>
          <li
            onClick={() => setSelectedCategoryId("all")}
            className={selectedCategoryId === "all" ? "is-active" : ""}
          >
            All
          </li>
          {categories.map((cat) => (
            <li
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={selectedCategoryId === cat.id ? "is-active" : ""}
            >
              {cat.name}
            </li>
          ))}
        </ul>

        <div className="kard">
          <Kard selectedCategoryId={selectedCategoryId} />
        </div>
      </div>
    </section>
  );
}

export default Main7;

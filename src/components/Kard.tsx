import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, resolveImageUrl } from "../lib/api";
import { addToCart, getCart, subscribeCart } from "../lib/cart";
import { getToken } from "../lib/auth";

interface Product {
  id: number;
  name: string;
  price: number;
  discount_price?: number | null;
  image?: string | null;
  category_id: number;
}

interface Review {
  product_id: number;
  rating: number;
}

interface Props {
  selectedCategoryId: number | "all";
}

function Kard({ selectedCategoryId }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<number[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pauseAutoScroll, setPauseAutoScroll] = useState(false);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();

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
    const fetchProducts = async () => {
      try {
        setIsProductsLoading(true);
        const query = selectedCategoryId === "all" ? "" : `?category_id=${selectedCategoryId}`;
        const data = await apiFetch<Product[]>(`/products/${query}`);
        setProducts(data);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setIsProductsLoading(false);
      }
    };
    fetchProducts();
  }, [selectedCategoryId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let direction: 1 | -1 = 1;
    let rafId = 0;

    const tick = () => {
      if (!el) return;
      if (!pauseAutoScroll) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll > 0) {
          el.scrollLeft += direction * 0.6;
          if (el.scrollLeft >= maxScroll - 1) direction = -1;
          if (el.scrollLeft <= 0) direction = 1;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [products.length, pauseAutoScroll]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await apiFetch<Review[]>("/reviews/");
        setReviews(data);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      }
    };
    fetchReviews();
  }, []);

  const handleRating = async (productId: number, value: number) => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    try {
      await apiFetch("/reviews/", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ product_id: productId, rating: value }),
      });
      setReviews((prev) => [...prev, { product_id: productId, rating: value }]);
      alert(`Siz ${value} baho berdingiz`);
    } catch (err) {
      console.error("Error saving rating:", err);
    }
  };

  const getAverageRating = (productId: number) => {
    const productRatings = reviews.filter((r) => r.product_id === productId);
    if (productRatings.length === 0) return 0;
    const sum = productRatings.reduce((acc, r) => acc + r.rating, 0);
    return sum / productRatings.length;
  };

  const handleBuyNow = (product: Product) => {
    if (cartItems.includes(product.id)) {
      navigate("/cart");
      return;
    }

    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      discount_price: product.discount_price ?? null,
      image: product.image ?? null,
      quantity: 1,
    });
    setCartItems((prev) => [...prev, product.id]);
  };

  if (isProductsLoading) {
    return (
      <div className="product-loading">
        <div className="spinner" />
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div
      className="product-grid"
      ref={listRef}
      onMouseEnter={() => setPauseAutoScroll(true)}
      onMouseLeave={() => setPauseAutoScroll(false)}
    >
      {products.map((product) => {
        const avgRating = getAverageRating(product.id);
        const inCart = cartItems.includes(product.id);

        return (
          <div key={product.id} className={`product-card ${inCart ? "in-cart" : ""}`}>
            <div className="product-media">
              {product.image ? (
                <img src={resolveImageUrl(product.image)} alt={product.name} />
              ) : (
                <div className="product-placeholder" />
              )}
              {product.discount_price ? <span className="product-tag">Sale</span> : null}
            </div>
            <div className="product-body">
              <h3>{product.name}</h3>
              <div className="product-price">
                {product.discount_price ? (
                  <>
                    <span className="price-old">{product.price}</span>
                    <span className="price-new">{product.discount_price}</span>
                  </>
                ) : (
                  <span className="price-new">{product.price}</span>
                )}
              </div>

              <div className="product-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-button ${star <= avgRating ? "active" : ""}`}
                    onClick={() => handleRating(product.id, star)}
                    aria-label={`Rate ${star}`}
                  >
                    ★
                  </button>
                ))}
                <span className="rating-value">{avgRating.toFixed(1)}</span>
              </div>

              <button className="product-btn" type="button" onClick={() => handleBuyNow(product)}>
                {inCart ? "Go to cart" : "Buy now"}
              </button>
            </div>
          </div>
        );
      })}

    </div>
  );
}

export default Kard;

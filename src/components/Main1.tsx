import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, resolveImageUrl } from "../lib/api";
import { addToCart, getCart, subscribeCart } from "../lib/cart";

interface Slide {
  id: number;
  title: string;
  text: string;
  img: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  discount_price?: number | null;
  image?: string | null;
}

function Main1() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<number[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const [slideData, productData] = await Promise.all([
          apiFetch<Slide[]>("/slides/"),
          apiFetch<Product[]>("/products/"),
        ]);
        const data = [...slideData].sort((a, b) => a.id - b.id);
        setSlides(data);
        setProducts(productData);
        if (data.length > 0) {
          setCount(data.length - 1);
        }
      } catch (err) {
        console.error("Slide fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSlides();
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
    if (slides.length < 2) return;
    const intervalId = setInterval(() => {
      setCount((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(intervalId);
  }, [slides.length]);

  const nextSlide = () => {
    if (slides.length === 0) return;
    setCount((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    if (slides.length === 0) return;
    setCount((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const featuredProduct = useMemo(() => {
    if (products.length === 0) return null;
    return products[count % products.length];
  }, [products, count]);

  const handleBuyNow = () => {
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

  if (loading) {
    return (
      <section className="main1 hero-loading">
        <div className="hero-wrap">
          <div className="hero-loading__content">
            <div className="hero-loading__kicker" />
            <div className="hero-loading__title" />
            <div className="hero-loading__text" />
            <div className="hero-loading__actions" />
          </div>
          <div className="hero-loading__media" />
        </div>
      </section>
    );
  }

  if (slides.length === 0) {
    return (
      <section className="main1 hero-empty">
        <div className="hero-wrap">
          <div className="hero-content">
            <span className="hero-kicker">SOB READY</span>
            <h1 className="hero-title">Hozircha slaydlar yo'q</h1>
            <p className="hero-text">Admin paneldan slayd qo'shing va sahifa jonlanadi.</p>
          </div>
        </div>
      </section>
    );
  }

  const current = slides[count];

  return (
    <section className="main1">
      <div className="hero-wrap">
        <div className="hero-content">
          <span className="hero-kicker">
            Fresh / Fast / Local {count === slides.length - 1 ? "• NEW" : ""}
          </span>
          <h1 className="hero-title">{current.title}</h1>
          <p className="hero-text">{current.text}</p>
          <div className="hero-actions">
            <button className="btn-primary" type="button" onClick={handleBuyNow}>
              {cartItems.includes(featuredProduct?.id ?? -1) ? "Go to cart" : "Buy now"}
            </button>
            <a className="btn-outline" href="#categories">
              See more
            </a>
          </div>
          <div className="hero-dots" role="tablist" aria-label="Slides">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                className={`hero-dot ${index === count ? "is-active" : ""}`}
                onClick={() => setCount(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-selected={index === count}
                role="tab"
                type="button"
              />
            ))}
          </div>
        </div>

        <div className="hero-media">
          <img className="hero-image" src={resolveImageUrl(current.img)} alt={current.title} />
          {slides.length > 1 && (
            <>
              <button className="hero-nav prev" onClick={prevSlide} aria-label="Previous slide" type="button">
                {"<"}
              </button>
              <button className="hero-nav next" onClick={nextSlide} aria-label="Next slide" type="button">
                {">"}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default Main1;

import { useEffect, useState } from "react";
import { addToCart, getCart, subscribeCart } from "../lib/cart";
import { useNavigate } from "react-router-dom";
import { apiFetch, resolveImageUrl } from "../lib/api";

interface Product {
  id: number;
  name: string;
  price: number;
  discount_price?: number | null;
  image?: string | null;
}

function Main3() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<number[]>([]);
  const navigate = useNavigate();

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

  useEffect(() => {
    const sync = () => {
      const cart = getCart();
      setCartItems(cart.map((item) => item.product_id));
    };
    sync();
    const unsubscribe = subscribeCart(sync);
    return () => unsubscribe();
  }, []);

  const handleAdd = (product: Product) => {
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
  };

  const featured = products.slice(0, 3);

  return (
    <section className="main3" id="promo">
      <div className="box1">
        <div className="img"></div>
        <h1>Fresh Vegetable</h1>
        <a className="btn-primary" href="#shop">
          Order now
        </a>
      </div>

      <div className="box2">
        <div className="section-head">
          <div className="head-spacer" aria-hidden="true" />
          <h2 className="head-title">New Products</h2>
          <div className="head-controls">
            <button type="button" className="nav-btn" aria-label="Previous">
              ‹
            </button>
            <button type="button" className="nav-btn active" aria-label="Next">
              ›
            </button>
          </div>
        </div>
        <div className="cardcha">
          {featured.map((product) => (
            <div className="box" key={product.id}>
              <div className="img">
                {product.image ? (
                  <img src={resolveImageUrl(product.image)} alt={product.name} />
                ) : null}
              </div>
              <h1>{product.name}</h1>
              <p>
                <b>{product.price}</b>{" "}
                {product.discount_price ? product.discount_price : null}
              </p>
              <button className="btn-primary" type="button" onClick={() => handleAdd(product)}>
                {cartItems.includes(product.id) ? "Go to cart" : "Add to cart"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Main3

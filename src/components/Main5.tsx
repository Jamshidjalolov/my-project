import { useEffect, useRef, useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

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

function Main5() {
  const sliderRef = useRef<Slider | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<number[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const list = await apiFetch<Product[]>("/products/");
        setProducts(list);
      } catch (error) {
        console.error("Best selling fetch error:", error);
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

  const settings = {
    dots: false,
    infinite: true,
    speed: 400,
    slidesToShow: Math.min(4, Math.max(1, products.length)),
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      {
        breakpoint: 1100,
        settings: { slidesToShow: 3 },
      },
      {
        breakpoint: 860,
        settings: { slidesToShow: 2 },
      },
      {
        breakpoint: 600,
        settings: { slidesToShow: 1 },
      },
    ],
  };

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

  return (
    <section className="main5" id="best-selling">
      <h2>--Best Selling Product--</h2>
      <ul>
        <li>
          <a href="#shop">Fruits</a>
        </li>
        <li>
          <a href="#shop">Vegetables</a>
        </li>
        <li>
          <a href="#shop">Meat</a>
        </li>
        <li>
          <a href="#shop">Milk</a>
        </li>
        <li>
          <a href="#shop">Cakes</a>
        </li>
        <li>
          <a href="#shop">Drinks</a>
        </li>
      </ul>

      <Slider ref={sliderRef} {...settings}>
        {products.map((product) => (
          <div className="fruits" key={product.id}>
            <div className="box">
              <div className="img">
                {product.image ? (
                  <img src={resolveImageUrl(product.image)} alt={product.name} />
                ) : (
                  <div className="img-placeholder" />
                )}
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
          </div>
        ))}
      </Slider>

      <div className="btnn">
        <button onClick={() => sliderRef.current?.slickPrev()} type="button">
          {"<"}
        </button>
        <button onClick={() => sliderRef.current?.slickNext()} type="button">
          {">"}
        </button>
      </div>
    </section>
  );
}

export default Main5;

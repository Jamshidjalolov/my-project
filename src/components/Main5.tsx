import React, { useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import img1 from "../images/Untitledd-1 1.png";
import img2 from "../images/muzqaymoq.png";

function Main5() {
  const sliderRef = useRef<Slider | null>(null);

  const settings = {
    dots: false,
    infinite: true,
    speed: 400,
    slidesToShow: 4, 
    slidesToScroll: 1,
    arrows: false, 
   
  };

  const products = [
    {
      title: "Bakery bread viennoiserie...",
      price: "$40.00",
      discount: "$30.00 (1kg)",
      img: null,
    },
    {
      title: "ICE cream cones sundae...",
      price: "$20.00",
      discount: "$15.00 (1kg)",
      img: img2,
    },
    {
      title: "Papaya seed auglis fruit...",
      price: "$45.00",
      discount: "$35.00 (1kg)",
      img: img1,
    },
    {
      title: "Papaya seed auglis fruit...",
      price: "$45.00",
      discount: "$35.00 (1kg)",
      img: img1,
    },
    {
      title: "Papaya seed auglis fruit...",
      price: "$45.00",
      discount: "$35.00 (1kg)",
      img: img1,
    },
    {
      title: "Papaya seed auglis fruit...",
      price: "$45.00",
      discount: "$35.00 (1kg)",
      img: img1,
    },
  ];

  return (
    <div className="main5" >
      <h2>--Best Selling Product--</h2>
      <ul>
        <li>Fruits</li>
        <li>Vegetables</li>
        <li>Meat</li>
        <li>Milk</li>
        <li>Cakes</li>
        <li>Drinks</li>
      </ul>

      <Slider ref={sliderRef} {...settings}>
        {products.map((product, index) => (
          <div className="fruits" key={index}>
            <div className="box">
              <div
                className="img"
                
              >
                {product.img ? (
                  <img
                    src={product.img}
                    alt={product.title}
                  />
                ) : (
                  <div
                    
                  />
                )}
              </div>
              <h1 >{product.title}</h1>
              <p>
                <b>{product.price}</b> {product.discount}
              </p>
            </div>
          </div>
        ))}
      </Slider>

      {}
      <div
        className="btnn"
        
      >
        <button
          onClick={() => sliderRef.current?.slickPrev()}
          
        >
          ◁
        </button>
        <button
          onClick={() => sliderRef.current?.slickNext()}
         
        >
          ▷
        </button>
      </div>
    </div>
  );
}

export default Main5;

import React, { useState } from "react";
import Kard from "../components/Kard";

function Main7() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All" },
    { id: "fruits", label: "Fruits" },
    { id: "vegetables", label: "Vegetables" },
    { id: "meat", label: "Meat" },
    { id: "milk", label: "Milk" },
    { id: "cakes", label: "Cakes" },
    { id: "drinks", label: "Drinks" },
  ];

  return (
    <div className="main7">
      <div className="cardcha">
        <div className="img"></div>
        <div className="btn1">
          <button>
            3 <br />
            day
          </button>
          <button>16 hour</button>
          <button>
            15 <br /> min
          </button>
          <button>
            10 <br /> sec
          </button>
        </div>
        <h1>Fresh Black Coffee </h1>
        <p>
          There are many variations of a <br /> passages of Lorem Ipsum <br /> available
        </p>
        <h3>
          $30.00 <span style={{ color: "#E21A43" }}> $20.00</span>
        </h3>
        <div className="btn3">
          <button id="btn2">Add to Bag</button>
          <button id="btn3">+</button>
        </div>
      </div>

      <div className="boxx">
        <h2>--Best Selling Product--</h2>
        <ul>
          {categories.map((cat) => (
            <li
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                cursor: "pointer",
                color: selectedCategory === cat.id ? "#E21A43" : "black",
                fontWeight: selectedCategory === cat.id ? "bold" : "normal",
              }}
            >
              {cat.label}
            </li>
          ))}
        </ul>

        <div className="kard">
          <Kard selectedCategory={selectedCategory} />
          
        </div>
      </div>
      
    </div>
  );
}

export default Main7;

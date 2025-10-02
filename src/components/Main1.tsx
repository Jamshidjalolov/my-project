import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../pages/admin/component/Firebase"; 

interface Slide {
  id: string;
  title: string;
  text: string;
  img: string;
}

function Main1() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    try {
      const snapshot = await getDocs(collection(db, "slides"));
      const list: Slide[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Slide, "id">),
      }));
      setSlides(list);
    } catch (err) {
      console.error("Slide fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCount((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCount((prev) => (prev - 1 + slides.length) % slides.length);
  };

  if (loading) {
    return (
      <div
        style={{
          height: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            border: "6px solid #f3f3f3",
            borderTop: "6px solid #b50202ff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        ></div>
        <p style={{ fontSize: "18px", color: "#444", fontWeight: "500" }}>
          Ma’lumot yuklanmoqda...
        </p>

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

  if (slides.length === 0) return <p>Hech qanday slayd topilmadi ❌</p>;

  return (
    <div
      className="main1"
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "30px",
      }}
    >
      <button
        onClick={prevSlide}
        style={{
          position: "absolute",
          top: "50%",
          left: "20px",
          transform: "translateY(-50%)",
          padding: "10px 15px",
          background: "#333",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          fontSize: "18px",
          zIndex: 2,
        }}
      >
        ◁
      </button>

      <div className="box1" style={{ flex: 1 }}>
        <h1>{slides[count].title}</h1>
        <p>{slides[count].text}</p>
        <div style={{ marginTop: "20px" }}>
          <button
            style={{
              padding: "10px 20px",
              marginRight: "10px",
              background: "#b50202ff",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            BUY Now
          </button>
          <button
            style={{
              padding: "10px 20px",
              background: "#edd3d3ff",
              color: "#d11245ff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            SEE More
          </button>
        </div>
      </div>

      <div className="box2">
        <img
          src={slides[count].img}
          alt="slide"
          style={{ maxWidth: "400px", borderRadius: "10px" }}
        />
      </div>

      <button
        onClick={nextSlide}
        style={{
          position: "absolute",
          top: "50%",
          right: "20px",
          transform: "translateY(-50%)",
          padding: "10px 15px",
          background: "#333",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          fontSize: "18px",
          zIndex: 2,
        }}
      >
        ▷
      </button>
    </div>
  );
}

export default Main1;

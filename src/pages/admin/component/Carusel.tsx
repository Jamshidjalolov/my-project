import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "./Firebase";

interface Slide {
  id: string;
  title: string;
  text: string;
  img: string;
}

function Carusel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);

  const [modalTitle, setModalTitle] = useState("");
  const [modalText, setModalText] = useState("");
  const [modalImg, setModalImg] = useState("");

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
      setLoading(false);
    } catch (err) {
      console.error("Slide fetch error:", err);
      setLoading(false);
    }
  };

  const deleteSlide = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this slide?")) return;
    try {
      await deleteDoc(doc(db, "slides", id));
      setSlides(slides.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const openAddModal = () => {
    setEditingSlide(null);
    setModalTitle("");
    setModalText("");
    setModalImg("");
    setShowModal(true);
  };

  const openEditModal = (slide: Slide) => {
    setEditingSlide(slide);
    setModalTitle(slide.title);
    setModalText(slide.text);
    setModalImg(slide.img);
    setShowModal(true);
  };

  const saveSlide = async () => {
    if (!modalTitle || !modalText || !modalImg) return alert("All fields are required");
    try {
      if (editingSlide) {
        
        const slideRef = doc(db, "slides", editingSlide.id);
        await updateDoc(slideRef, { title: modalTitle, text: modalText, img: modalImg });
        setSlides(
          slides.map((s) =>
            s.id === editingSlide.id
              ? { ...s, title: modalTitle, text: modalText, img: modalImg }
              : s
          )
        );
      } else {
        
        const docRef = await addDoc(collection(db, "slides"), {
          title: modalTitle,
          text: modalText,
          img: modalImg,
        });
        setSlides([...slides, { id: docRef.id, title: modalTitle, text: modalText, img: modalImg }]);
      }
      setShowModal(false);
    } catch (err) {
      console.error("Save slide error:", err);
    }
  };

  if (loading) return <p>Loading slides...</p>;

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{  marginBottom: "20px" }}>📅Carusel</h1>

      <button
        onClick={openAddModal}
        style={{
          marginBottom: "20px",
          padding: "10px 20px",
          background: "#4caf50",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        Add Carusel
      </button>

      {slides.map((slide) => (
        <div
          key={slide.id}
          style={{
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "15px",
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <img
            src={slide.img}
            alt={slide.title}
            style={{ width: "150px", height: "100px", objectFit: "cover", borderRadius: "5px" }}
          />
          <div style={{ flex: 1 }}>
            <h3>{slide.title}</h3>
            <p>{slide.text}</p>
          </div>
          <button
            onClick={() => openEditModal(slide)}
            style={{
              padding: "8px 12px",
              background: "#2196f3",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginRight: "5px",
            }}
          >
            Edit
          </button>
          <button
            onClick={() => deleteSlide(slide.id)}
            style={{
              padding: "8px 12px",
              background: "#f44336",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      ))}

      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              width: "400px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <h2>{editingSlide ? "Edit Slide" : "Add New Slide"}</h2>
            <input
              type="text"
              placeholder="Title"
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
              style={{ padding: "8px", fontSize: "14px" }}
            />
            <textarea
              placeholder="Text"
              value={modalText}
              onChange={(e) => setModalText(e.target.value)}
              style={{ padding: "8px", fontSize: "14px" }}
            />
            <input
              type="text"
              placeholder="Image URL"
              value={modalImg}
              onChange={(e) => setModalImg(e.target.value)}
              style={{ padding: "8px", fontSize: "14px" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "8px 12px",
                  background: "#f44336",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveSlide}
                style={{
                  padding: "8px 12px",
                  background: "#4caf50",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                {editingSlide ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Carusel;

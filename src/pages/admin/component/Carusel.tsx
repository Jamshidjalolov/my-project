import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import AdminHeader from "./AdminHeader";

interface Slide {
  id: number;
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
      const data = await apiFetch<Slide[]>("/slides/");
      setSlides(data);
    } catch (err) {
      console.error("Slide fetch error:", err);
    } finally {
      await new Promise((r) => setTimeout(r, 400));
      setLoading(false);
    }
  };

  const deleteSlide = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this slide?")) return;
    try {
      await apiFetch(`/slides/${id}`, { method: "DELETE", auth: true });
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
        const updated = await apiFetch<Slide>(`/slides/${editingSlide.id}`, {
          method: "PUT",
          auth: true,
          body: JSON.stringify({ title: modalTitle, text: modalText, img: modalImg }),
        });
        setSlides(slides.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await apiFetch<Slide>("/slides/", {
          method: "POST",
          auth: true,
          body: JSON.stringify({ title: modalTitle, text: modalText, img: modalImg }),
        });
        setSlides([created, ...slides]);
      }
      setShowModal(false);
    } catch (err) {
      console.error("Save slide error:", err);
    }
  };

  if (loading)
    return (
      <div className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2>Carusel</h2>
            <p className="admin-section__sub">Slide kontentini boshqarish</p>
          </div>
        </div>
        <div className="admin-scroll">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="admin-skeleton admin-skeleton-card" style={{ height: 140, marginBottom: 14 }} />
          ))}
        </div>
      </div>
    );

  return (
    <div className="admin-section">
      <AdminHeader
        title="Carusel"
        subtitle="Slide kontentini boshqarish"
        right={
          <button onClick={openAddModal} className="admin-primary-btn">
            Add Carusel
          </button>
        }
      />

      <div className="admin-scroll">
        {slides.map((slide) => (
          <div key={slide.id} className="admin-slide-card">
            <img src={slide.img} alt={slide.title} />
            <div className="admin-slide-card__body">
              <h3>{slide.title}</h3>
              <p>{slide.text}</p>
            </div>
            <div className="admin-slide-card__actions">
              <button onClick={() => openEditModal(slide)} className="admin-warning-btn">
                Edit
              </button>
              <button onClick={() => deleteSlide(slide.id)} className="admin-danger-btn">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="admin-modal">
          <div className="admin-modal__card">
            <h2>{editingSlide ? "Edit Slide" : "Add New Slide"}</h2>
            <input
              type="text"
              placeholder="Title"
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
            />
            <textarea
              placeholder="Text"
              value={modalText}
              onChange={(e) => setModalText(e.target.value)}
            />
            <input
              type="text"
              placeholder="Image URL"
              value={modalImg}
              onChange={(e) => setModalImg(e.target.value)}
            />
            <div className="admin-modal__actions">
              <button onClick={() => setShowModal(false)} className="admin-danger-btn">
                Cancel
              </button>
              <button onClick={saveSlide} className="admin-primary-btn">
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

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, collection, getDocs } from "firebase/firestore";
import { db } from "../pages/admin/component/Firebase";
import { Avatar } from "@mui/material";
import Dropdown from "react-bootstrap/Dropdown";

function Header() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const [cartCount, setCartCount] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, "users", currentUser.uid);
        const unsubUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setRole(userData.role || "user");
          } else {
            setRole("user");
          }
        });
        return () => unsubUser();
      } else {
        setUser(null);
        setRole("");
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  useEffect(() => {
    const fetchCartCount = async () => {
      const querySnapshot = await getDocs(collection(db, "buy"));
      setCartCount(querySnapshot.size);
    };
    fetchCartCount();
  }, []);

  return (
    <div
      className="header"
     
    >
      <div className="logo">
        <div className="img">
         <img src="../dist/assets/SOB READY.png" alt="" /></div>
      </div>

      <div className="box">
        <ul >
          <li><Link to="/" style={{ textDecoration: "none", color: "#333" }}>Home</Link></li>
          <li><Link to="/" style={{ textDecoration: "none", color: "#333" }}>Category</Link></li>
          <li><Link to="/" style={{ textDecoration: "none", color: "#333" }}>Shop</Link></li>
          <li><Link to="/" style={{ textDecoration: "none", color: "#333" }}>Blog</Link></li>
          <li><Link to="/" style={{ textDecoration: "none", color: "#333" }}>Page</Link></li>
        </ul>
      </div>

      <div className="box2" style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        <input
          type="search"
          placeholder="Search..."
          style={{ padding: "5px 10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />
        <button
          id="btn1"
          style={{ padding: "6px 10px", borderRadius: "5px", border: "1px solid #ccc", cursor: "pointer" }}
        >
          🔎
        </button>

        <div
          style={{ position: "relative", cursor: "pointer" }}
          onClick={() => navigate("/cart")}
        >
          <span style={{ fontSize: "24px", marginLeft: "20px" }}>🛒</span>
          {cartCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-5px",
                right: "-10px",
                background: "#f44336",
                color: "#fff",
                borderRadius: "50%",
                padding: "2px 6px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {cartCount}
            </span>
          )}
        </div>
<Dropdown>
  <Dropdown.Toggle
    variant=""
    id="dropdown-basic"
    style={{ padding: "0", border: "none", background: "none", marginLeft:"170px", marginTop:"15px" }}
  >
    {user ? (
      <Avatar
        alt={user.email || "User"}
        src={user.photoURL || ""}
        style={{
          width: 45,
          height: 45,
          background: !user.photoURL ? "#2196f3" : undefined,
          fontSize: "16px",
          fontWeight: "bold",
        }}
      >
        {!user.photoURL && user.email?.charAt(0).toUpperCase()}
      </Avatar>
    ) : (
      <span style={{ fontSize: "24px" }}>👤</span>
    )}
  </Dropdown.Toggle>

  <Dropdown.Menu>
    {user && (
      <Dropdown.Header style={{ fontSize: "14px", color: "#555" }}>
        {user.email}
      </Dropdown.Header>
    )}
    {role === "ADMIN" && (
      <Dropdown.Item href="/admin">Admin</Dropdown.Item>
    )}
    {(role === "CHEF" || role === "ADMIN") && (
      <Dropdown.Item href="/chef">Chef</Dropdown.Item>
    )}
    {!user && (
      <Dropdown.Item href="/register">Register</Dropdown.Item>
    )}
    {user && (
      <Dropdown.Item href="/" onClick={handleLogout}>
        LogOut
      </Dropdown.Item>
    )}
  </Dropdown.Menu>
</Dropdown>

      </div>
    </div>
  );
}

export default Header;

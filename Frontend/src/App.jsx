import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import OrdersPage from "./pages/OrdersPage";
import AddressPage from "./pages/AddressPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import AdminPage from "./pages/AdminPage";
import AdminProductEditPage from "./pages/AdminProductEditPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminUsersPage from "./pages/AdminUsersPage";

function App() {
  const [user, setUser] = useState(() => {
    const email = localStorage.getItem("userEmail");
    const role = localStorage.getItem("userRole");
    const token = localStorage.getItem("token");

    if (email && role && token) {
      return { email, role, token };
    }

    return null;
  });

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/products"
          element={<ProductsPage user={user} setUser={setUser} />}
        />

        <Route
          path="/products/:id"
          element={<ProductDetailPage user={user} />}
        />

        <Route
          path="/cart"
          element={user ? <CartPage user={user} /> : <Navigate to="/login" />}
        />

        <Route
          path="/checkout"
          element={user ? <CheckoutPage user={user} /> : <Navigate to="/login" />}
        />

        <Route
          path="/addresses"
          element={user ? <AddressPage user={user} /> : <Navigate to="/login" />}
        />

        <Route
          path="/orders"
          element={user ? <OrdersPage user={user} /> : <Navigate to="/login" />}
        />

        <Route
          path="/orders/:id"
          element={user ? <OrderDetailPage user={user} /> : <Navigate to="/login" />}
        />

        <Route
          path="/admin/dashboard"
          element={user && user.role === "ADMIN" ? <AdminDashboardPage user={user} /> : <Navigate to="/products" />}
        />

        <Route
          path="/admin"
          element={user && user.role === "ADMIN" ? <AdminPage user={user} /> : <Navigate to="/products" />}
        />

        <Route
          path="/admin/products/:id"
          element={user && user.role === "ADMIN" ? <AdminProductEditPage user={user} /> : <Navigate to="/products" />}
        />

        <Route
          path="/admin/orders"
          element={user && user.role === "ADMIN" ? <AdminOrdersPage user={user} /> : <Navigate to="/products" />}
        />

        <Route
          path="/admin/users"
          element={user && user.role === "ADMIN" ? <AdminUsersPage user={user} /> : <Navigate to="/products" />}
        />

        <Route path="*" element={<Navigate to="/products" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api";

function AdminDashboardPage({ user }) {
  const dashboardQuery = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => apiClient.get("/api/admin/dashboard?lowStockThreshold=5"),
  });

  const lowStockQuery = useQuery({
    queryKey: ["admin", "low-stock"],
    queryFn: () => apiClient.get("/api/admin/low-stock-products?threshold=5&page=0&size=8"),
  });

  const summary = dashboardQuery.data || {};
  const lowStockProducts = lowStockQuery.data?.content || [];

  return (
    <div>
      <div className="navbar">
        <strong>Admin Dashboard</strong>
        <Link to="/admin">Products</Link>
        <Link to="/admin/orders">Orders</Link>
        <Link to="/admin/users">Users</Link>
        <Link to="/products">Storefront</Link>
      </div>

      <div className="page">
        <div className="admin-header">
          <h1>Business Dashboard</h1>
          <p>Logged in as ADMIN: {user.email}</p>
        </div>

        {dashboardQuery.isLoading && <p>Loading dashboard...</p>}
        {dashboardQuery.isError && <p className="error-message">{dashboardQuery.error.message}</p>}

        <div className="dashboard-grid">
          <div className="metric-card"><span>Sales</span><strong>{summary.salesTotal ?? 0}</strong></div>
          <div className="metric-card"><span>Total Orders</span><strong>{summary.totalOrders ?? 0}</strong></div>
          <div className="metric-card"><span>Paid Orders</span><strong>{summary.paidOrders ?? 0}</strong></div>
          <div className="metric-card"><span>Unpaid Orders</span><strong>{summary.unpaidOrders ?? 0}</strong></div>
          <div className="metric-card"><span>Users</span><strong>{summary.totalUsers ?? 0}</strong></div>
          <div className="metric-card"><span>Products</span><strong>{summary.totalProducts ?? 0}</strong></div>
          <div className="metric-card warning"><span>Low Stock</span><strong>{summary.lowStockProducts ?? 0}</strong></div>
        </div>

        <h2>Low Stock Alerts</h2>
        {lowStockQuery.isLoading && <p>Loading low stock products...</p>}
        {lowStockQuery.isError && <p className="error-message">{lowStockQuery.error.message}</p>}
        {lowStockProducts.map((product) => (
          <div className="list-card compact-row" key={product.id}>
            <strong>{product.title}</strong>
            <span>Category: {product.category}</span>
            <span>Available: {product.availableStock ?? product.stock}</span>
            <Link to={`/products/${product.id}`}>View</Link>
          </div>
        ))}
        {!lowStockQuery.isLoading && lowStockProducts.length === 0 && <p>No low stock products.</p>}
      </div>
    </div>
  );
}

export default AdminDashboardPage;

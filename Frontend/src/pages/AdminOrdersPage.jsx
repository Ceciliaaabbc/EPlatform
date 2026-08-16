import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api";

const ORDER_STATUSES = [
  "PENDING",
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "PENDING_SHIPMENT",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDING",
  "REFUNDED",
];

const PAYMENT_STATUSES = ["UNPAID", "PAID", "CANCELLED", "EXPIRED", "FAILED", "REFUNDED"];
const ADMIN_ORDER_PAGE_SIZE = 10;

function buildAdminOrderQuery(filters) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("size", String(ADMIN_ORDER_PAGE_SIZE));
  if (filters.status) params.set("status", filters.status);
  if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  if (filters.userEmail) params.set("userEmail", filters.userEmail);
  if (filters.createdFrom) params.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) params.set("createdTo", filters.createdTo);
  return `/api/orders/admin/search?${params.toString()}`;
}

function AdminOrdersPage({ user }) {
  const queryClient = useQueryClient();
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [shippingForms, setShippingForms] = useState({});
  const [draftFilters, setDraftFilters] = useState({
    status: "",
    paymentStatus: "",
    userEmail: "",
    createdFrom: "",
    createdTo: "",
  });
  const [filters, setFilters] = useState({ ...draftFilters, page: 0 });

  const ordersQuery = useQuery({
    queryKey: ["orders", "admin", filters],
    queryFn: () => apiClient.get(buildAdminOrderQuery(filters)),
  });

  const itemsQuery = useQuery({
    queryKey: ["order-items", expandedOrderId],
    queryFn: () => apiClient.get(`/api/orders/${expandedOrderId}/items`),
    enabled: Boolean(expandedOrderId),
  });

  const afterSalesQuery = useQuery({
    queryKey: ["after-sales", "admin"],
    queryFn: () => apiClient.get("/api/after-sales/admin"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }) => apiClient.put(`/api/orders/${orderId}/status?status=${status}`),
    onSuccess: () => {
      alert("Order status updated");
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
    },
    onError: () => alert("Update status failed"),
  });

  const shipOrderMutation = useMutation({
    mutationFn: ({ orderId, carrier, trackingNumber }) => apiClient.post(`/api/orders/${orderId}/ship`, {
      carrier,
      trackingNumber,
    }),
    onSuccess: () => {
      alert("Order shipped");
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
    },
    onError: (error) => alert(error.message || "Ship order failed"),
  });

  const refundOrderMutation = useMutation({
    mutationFn: (orderId) => apiClient.post(`/api/orders/${orderId}/refund`),
    onSuccess: () => {
      alert("Order refunded");
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
    },
    onError: (error) => alert(error.message || "Refund failed"),
  });

  const reviewAfterSaleMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.put(`/api/after-sales/${id}/review`, {
      status,
      adminNote: status === "APPROVED" ? "Approved by admin" : "Rejected by admin",
    }),
    onSuccess: () => {
      alert("After-sale request reviewed");
      queryClient.invalidateQueries({ queryKey: ["after-sales", "admin"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
    },
    onError: (error) => alert(error.message || "Review after-sale failed"),
  });

  const orderPage = ordersQuery.data || { content: [], number: 0, totalPages: 0, totalElements: 0, first: true, last: true };
  const orders = orderPage.content || [];
  const afterSales = afterSalesQuery.data || [];

  function updateDraftFilter(field, value) {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  }

  function applyFilters() {
    setFilters({
      status: draftFilters.status,
      paymentStatus: draftFilters.paymentStatus,
      userEmail: draftFilters.userEmail.trim(),
      createdFrom: draftFilters.createdFrom,
      createdTo: draftFilters.createdTo,
      page: 0,
    });
  }

  function clearFilters() {
    const cleared = { status: "", paymentStatus: "", userEmail: "", createdFrom: "", createdTo: "" };
    setDraftFilters(cleared);
    setFilters({ ...cleared, page: 0 });
  }

  function goToPage(page) {
    setFilters((current) => ({ ...current, page }));
  }

  function updateShippingForm(orderId, field, value) {
    setShippingForms((current) => ({
      ...current,
      [orderId]: {
        carrier: "",
        trackingNumber: "",
        ...(current[orderId] || {}),
        [field]: value,
      },
    }));
  }

  function shipOrder(orderId) {
    const form = shippingForms[orderId] || {};
    if (!form.carrier?.trim() || !form.trackingNumber?.trim()) {
      alert("Carrier and tracking number are required");
      return;
    }

    shipOrderMutation.mutate({
      orderId,
      carrier: form.carrier,
      trackingNumber: form.trackingNumber,
    });
  }

  return (
    <div>
      <div className="navbar">
        <strong>Admin Orders</strong>
        <Link to="/admin/dashboard">Dashboard</Link>
        <Link to="/admin">Products</Link>
        <Link to="/admin/users">Users</Link>
        <Link to="/products">Storefront</Link>
      </div>

      <div className="page">
        <div className="admin-header">
          <h1>Order Management</h1>
          <p>Logged in as ADMIN: {user.email}</p>
        </div>

        <section>
          <h2>After-sale Requests</h2>
          {afterSalesQuery.isLoading && <p>Loading after-sale requests...</p>}
          {afterSalesQuery.isError && <p className="error-message">{afterSalesQuery.error.message}</p>}
          {!afterSalesQuery.isLoading && afterSales.length === 0 && <p>No after-sale requests.</p>}
          {afterSales.map((request) => (
            <div className="list-card" key={request.id}>
              <h3>{request.type} - {request.status}</h3>
              <p>Order: {request.orderId}</p>
              <p>User: {request.userEmail}</p>
              <p>Reason: {request.reason}</p>
              {request.adminNote && <p>Admin note: {request.adminNote}</p>}
              {request.status === "REQUESTED" && (
                <div className="admin-actions">
                  <button
                    disabled={reviewAfterSaleMutation.isPending}
                    onClick={() => reviewAfterSaleMutation.mutate({ id: request.id, status: "APPROVED" })}
                  >
                    Approve
                  </button>
                  <button
                    disabled={reviewAfterSaleMutation.isPending}
                    onClick={() => reviewAfterSaleMutation.mutate({ id: request.id, status: "REJECTED" })}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>

        <div className="filter-bar">
          <select value={draftFilters.status} onChange={(e) => updateDraftFilter("status", e.target.value)}>
            <option value="">All order statuses</option>
            {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select value={draftFilters.paymentStatus} onChange={(e) => updateDraftFilter("paymentStatus", e.target.value)}>
            <option value="">All payment statuses</option>
            {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input placeholder="User email" value={draftFilters.userEmail} onChange={(e) => updateDraftFilter("userEmail", e.target.value)} />
          <input type="date" value={draftFilters.createdFrom} onChange={(e) => updateDraftFilter("createdFrom", e.target.value)} />
          <input type="date" value={draftFilters.createdTo} onChange={(e) => updateDraftFilter("createdTo", e.target.value)} />
          <button onClick={applyFilters}>Apply</button>
          <button onClick={clearFilters}>Clear</button>
        </div>

        {ordersQuery.isLoading && <p>Loading orders...</p>}
        {ordersQuery.isError && <p className="error-message">{ordersQuery.error.message}</p>}
        {!ordersQuery.isLoading && !ordersQuery.isError && (
          <p>Showing {orders.length} of {orderPage.totalElements || 0} orders</p>
        )}

        {orders.map((order) => (
          <div className="list-card" key={order.id}>
            <h3>Order ID: {order.id}</h3>
            <p>User: {order.userEmail}</p>
            <p>Total: {order.total}</p>

            <p>
              Status: <span className={"status-badge order-status-" + order.status.toLowerCase()}>{order.status}</span>
            </p>

            <p>Payment Status: {order.paymentStatus}</p>
            <p>Created At: {order.createdAt}</p>
            {order.trackingNumber && (
              <p>
                Shipping: {order.carrier} - {order.trackingNumber}
                {order.shippedAt && <> - Shipped At: {order.shippedAt}</>}
              </p>
            )}

            <select
              defaultValue={order.status}
              onChange={(e) => updateStatusMutation.mutate({ orderId: order.id, status: e.target.value })}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <button onClick={() => setExpandedOrderId(order.id)}>View Items</button>
            {order.paymentStatus === "PAID" && order.status !== "REFUNDED" && (
              <button disabled={refundOrderMutation.isPending} onClick={() => refundOrderMutation.mutate(order.id)}>Refund</button>
            )}

            {order.paymentStatus === "PAID" && (order.status === "PROCESSING" || order.status === "PENDING_SHIPMENT") && (
              <div className="admin-form">
                <h4>Ship Order</h4>
                <input
                  placeholder="Carrier"
                  value={shippingForms[order.id]?.carrier || ""}
                  onChange={(e) => updateShippingForm(order.id, "carrier", e.target.value)}
                />
                <input
                  placeholder="Tracking number"
                  value={shippingForms[order.id]?.trackingNumber || ""}
                  onChange={(e) => updateShippingForm(order.id, "trackingNumber", e.target.value)}
                />
                <button disabled={shipOrderMutation.isPending} onClick={() => shipOrder(order.id)}>Ship</button>
              </div>
            )}

            {expandedOrderId === order.id && itemsQuery.data && (
              <div>
                <h4>Items:</h4>
                {itemsQuery.data.map((item) => (
                  <p key={item.id}>
                    {item.title} - Price: {item.price} - Quantity: {item.quantity}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="pagination-bar">
          <button disabled={orderPage.first} onClick={() => goToPage(orderPage.number - 1)}>Previous</button>
          <span>Page {(orderPage.number || 0) + 1} of {orderPage.totalPages || 1}</span>
          <button disabled={orderPage.last || orderPage.totalPages === 0} onClick={() => goToPage(orderPage.number + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}

export default AdminOrdersPage;

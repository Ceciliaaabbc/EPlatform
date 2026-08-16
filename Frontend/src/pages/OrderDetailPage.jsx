import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api";

function OrderDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [afterSaleForm, setAfterSaleForm] = useState({ type: "REFUND", reason: "" });

  const orderQuery = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiClient.get(`/api/orders/${id}`),
  });

  const itemsQuery = useQuery({
    queryKey: ["order-items", id],
    queryFn: () => apiClient.get(`/api/orders/${id}/items`),
  });

  const afterSalesQuery = useQuery({
    queryKey: ["after-sales", "order", id],
    queryFn: () => apiClient.get(`/api/after-sales/orders/${id}`),
  });

  const hasAddressSnapshot = Boolean(orderQuery.data?.shippingRecipientName);

  const addressQuery = useQuery({
    queryKey: ["order-address", orderQuery.data?.shippingAddressId],
    queryFn: () => apiClient.get(`/api/addresses/${orderQuery.data.shippingAddressId}`),
    enabled: Boolean(orderQuery.data?.shippingAddressId) && !hasAddressSnapshot,
  });

  const payMutation = useMutation({
    mutationFn: () => apiClient.post(`/api/orders/${id}/pay`),
    onSuccess: (data) => {
      if (!data.checkoutUrl) {
        alert("No checkout URL returned");
        return;
      }

      window.location.href = data.checkoutUrl;
    },
    onError: (error) => alert(error.message || "Payment failed"),
  });

  const afterSaleMutation = useMutation({
    mutationFn: () => apiClient.post(`/api/after-sales/orders/${id}`, afterSaleForm),
    onSuccess: () => {
      setAfterSaleForm({ type: "REFUND", reason: "" });
      queryClient.invalidateQueries({ queryKey: ["after-sales", "order", id] });
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      alert("After-sale request submitted");
    },
    onError: (error) => alert(error.message || "After-sale request failed"),
  });

  if (orderQuery.isLoading) {
    return <p>Loading order...</p>;
  }

  if (orderQuery.isError) {
    return <p className="error-message">{orderQuery.error.message}</p>;
  }

  const order = orderQuery.data;
  const items = itemsQuery.data || [];
  const address = hasAddressSnapshot ? {
    recipientName: order.shippingRecipientName,
    phone: order.shippingPhone,
    street: order.shippingStreet,
    city: order.shippingCity,
    province: order.shippingProvince,
    country: order.shippingCountry,
    postalCode: order.shippingPostalCode,
  } : addressQuery.data;
  const canPay = order.paymentStatus !== "PAID"
    && order.paymentStatus !== "REFUNDED"
    && order.paymentStatus !== "CANCELLED"
    && order.paymentStatus !== "EXPIRED"
    && order.status !== "CANCELLED"
    && order.status !== "REFUNDED";
  const canRequestAfterSale = order.status !== "CANCELLED"
    && order.status !== "REFUNDED"
    && order.status !== "COMPLETED";
  const afterSales = afterSalesQuery.data || [];

  return (
    <div>
      <div className="navbar">
        <strong>Order Detail</strong>
        <Link to="/products">Products</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/orders">Orders</Link>
      </div>

      <div className="page">
        {searchParams.get("payment") === "cancelled" && (
          <p className="error-message">Payment was cancelled. You can continue payment below.</p>
        )}

        <div className="list-card">
          <h1>Order #{order.id}</h1>
          <p>Total: {order.total}</p>
          <p>Status: {order.status}</p>
          <p>Payment Status: {order.paymentStatus}</p>
          <p>Created At: {order.createdAt}</p>
          {order.trackingNumber && (
            <>
              <p>Carrier: {order.carrier}</p>
              <p>Tracking Number: {order.trackingNumber}</p>
              <p>Shipped At: {order.shippedAt}</p>
            </>
          )}

          {payMutation.isError && <p className="error-message">{payMutation.error.message || "Payment failed"}</p>}
          {canPay && (
            <button disabled={payMutation.isPending} onClick={() => payMutation.mutate()}>
              Pay Now
            </button>
          )}
          {!canPay && order.paymentStatus !== "PAID" && (
            <p className="error-message">This order cannot be paid in its current state.</p>
          )}
        </div>

        <h2>Shipping</h2>
        {order.trackingNumber ? (
          <div className="list-card">
            <h3>{order.carrier}</h3>
            <p>Tracking Number: {order.trackingNumber}</p>
            <p>Shipped At: {order.shippedAt}</p>
          </div>
        ) : (
          <p>No tracking information yet.</p>
        )}

        <h2>Items</h2>
        {itemsQuery.isLoading && <p>Loading items...</p>}
        {itemsQuery.isError && <p className="error-message">{itemsQuery.error.message || "Could not load order items."}</p>}
        {!itemsQuery.isLoading && !itemsQuery.isError && items.length === 0 && <p>No items found for this order.</p>}
        {items.map((item) => (
          <div className="list-card" key={item.id}>
            <h3>{item.title}</h3>
            <p>Price: {item.price}</p>
            <p>Quantity: {item.quantity}</p>
          </div>
        ))}

        <h2>Shipping Address</h2>
        {!order.shippingAddressId && !hasAddressSnapshot && <p>No shipping address was saved for this order.</p>}
        {addressQuery.isLoading && <p>Loading address...</p>}
        {addressQuery.isError && !hasAddressSnapshot && <p className="error-message">{addressQuery.error.message || "Could not load shipping address."}</p>}
        {address && (
          <div className="list-card">
            <h3>{address.recipientName}</h3>
            <p>{address.phone}</p>
            <p>
              {[address.street, address.city, address.province, address.country, address.postalCode]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        )}

        <h2>After-sale</h2>
        {afterSalesQuery.isLoading && <p>Loading after-sale requests...</p>}
        {afterSalesQuery.isError && <p className="error-message">{afterSalesQuery.error.message || "Could not load after-sale requests."}</p>}
        {afterSales.map((request) => (
          <div className="list-card" key={request.id}>
            <h3>{request.type} - {request.status}</h3>
            <p>Reason: {request.reason}</p>
            {request.adminNote && <p>Admin note: {request.adminNote}</p>}
            <p>Created At: {request.createdAt}</p>
          </div>
        ))}
        {afterSales.length === 0 && !afterSalesQuery.isLoading && <p>No after-sale requests yet.</p>}

        {canRequestAfterSale && (
          <div className="list-card">
            <h3>Request After-sale</h3>
            <select
              value={afterSaleForm.type}
              onChange={(e) => setAfterSaleForm((current) => ({ ...current, type: e.target.value }))}
            >
              <option value="CANCEL">Cancel unpaid order</option>
              <option value="REFUND">Refund paid order</option>
              <option value="RETURN">Return item</option>
            </select>
            <textarea
              placeholder="Reason"
              value={afterSaleForm.reason}
              onChange={(e) => setAfterSaleForm((current) => ({ ...current, reason: e.target.value }))}
            />
            <button
              disabled={afterSaleMutation.isPending || !afterSaleForm.reason.trim()}
              onClick={() => afterSaleMutation.mutate()}
            >
              Submit Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderDetailPage;

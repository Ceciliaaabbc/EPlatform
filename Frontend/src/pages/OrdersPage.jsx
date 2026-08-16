import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api";

function OrdersPage() {
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiClient.get("/api/orders"),
  });

  const itemsQuery = useQuery({
    queryKey: ["order-items", expandedOrderId],
    queryFn: () => apiClient.get(`/api/orders/${expandedOrderId}/items`),
    enabled: Boolean(expandedOrderId),
  });

  const orders = ordersQuery.data || [];

  return (
    <div>
      <div className="navbar">
        <strong>Mini ECommerce</strong>
        <Link to="/products">Products</Link>
        <Link to="/cart">Cart</Link>
      </div>

      <div className="page">
        <h1>Your Orders</h1>

        {ordersQuery.isLoading && <p>Loading orders...</p>}
        {ordersQuery.isError && <p className="error-message">{ordersQuery.error.message}</p>}

        {orders.map((order) => (
          <div className="list-card" key={order.id}>
            <h3>Order ID: {order.id}</h3>
            <p>User: {order.userEmail}</p>
            <p>Total: {order.total}</p>
            <p>Status: {order.status}</p>
            <p>Payment Status: {order.paymentStatus}</p>
            <p>Created At: {order.createdAt}</p>

            <Link to={`/orders/${order.id}`}>Open Order Detail</Link>

            <button onClick={() => setExpandedOrderId(order.id)}>View Items</button>

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
      </div>
    </div>
  );
}

export default OrdersPage;

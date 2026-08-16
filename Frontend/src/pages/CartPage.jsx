import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api";

function CartPage({ user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedCartItemIds, setSelectedCartItemIds] = useState([]);

  const cartQuery = useQuery({
    queryKey: ["cart", user.email],
    queryFn: () => apiClient.get("/api/cart"),
    refetchOnMount: "always",
    staleTime: 0,
  });

  const removeMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/api/cart/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const batchRemoveMutation = useMutation({
    mutationFn: (ids) => apiClient.delete(`/api/cart/batch?${ids.map((id) => `ids=${id}`).join("&")}`),
    onSuccess: () => {
      setSelectedCartItemIds([]);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error) => alert(error.message || "Batch remove failed"),
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }) => apiClient.put(`/api/cart/${id}?quantity=${quantity}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: (orderId) => apiClient.put(`/api/orders/${orderId}/cancel-payment`),
    onSuccess: () => alert("Payment cancelled. Your order was not paid."),
    onError: (error) => alert(error.message || "Cancel payment failed"),
  });
  const cancelPayment = cancelPaymentMutation.mutate;

  useEffect(() => {
    const payment = searchParams.get("payment");
    const orderId = searchParams.get("orderId");

    if (payment === "cancelled" && orderId) {
      cancelPayment(orderId);
    }
  }, [cancelPayment, searchParams]);

  const cartItems = cartQuery.data || [];
  const selectedItems = cartItems.filter((item) => selectedCartItemIds.includes(item.id));
  const checkoutItems = selectedItems.length > 0 ? selectedItems : cartItems;
  const total = checkoutItems.reduce((sum, item) => sum + Number(item.currentPrice ?? item.price) * item.quantity, 0);
  const hasBlockingWarnings = checkoutItems.some((item) => item.stockWarning || item.priceChanged);

  async function checkout() {
    const latestCart = await cartQuery.refetch();
    const latestItems = latestCart.data || [];

    const latestSelectedItems = latestItems.filter((item) => selectedCartItemIds.includes(item.id));
    const latestCheckoutItems = latestSelectedItems.length > 0 ? latestSelectedItems : latestItems;

    if (latestCheckoutItems.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (latestCheckoutItems.some((item) => item.stockWarning || item.priceChanged)) {
      alert("Please fix stock or price warnings before checkout");
      return;
    }

    const params = new URLSearchParams();
    latestCheckoutItems.forEach((item) => params.append("cartItemIds", item.id));
    navigate(`/checkout?${params.toString()}`);
  }

  function toggleSelected(id, checked) {
    setSelectedCartItemIds((current) => (
      checked ? [...new Set([...current, id])] : current.filter((itemId) => itemId !== id)
    ));
  }

  function selectAll(checked) {
    setSelectedCartItemIds(checked ? cartItems.map((item) => item.id) : []);
  }

  return (
    <div>
      <div className="navbar">
        <strong>Mini ECommerce</strong>
        <Link to="/products">Products</Link>
        <Link to="/addresses">Addresses</Link>
        <Link to="/orders">Orders</Link>
        <span>{user.email}</span>
      </div>

      <div className="page">
        <h1>Your Cart</h1>

        {searchParams.get("payment") === "cancelled" && (
          <p style={{ color: "red" }}>Payment cancelled. Your order was not paid.</p>
        )}

        {searchParams.get("cart") === "empty" && (
          <p className="error-message">Your cart is empty. Add items before checkout.</p>
        )}

        {cartQuery.isLoading && <p>Loading cart...</p>}
        {cartQuery.isError && <p className="error-message">{cartQuery.error.message}</p>}

        {cartItems.length > 0 && (
          <div className="admin-actions">
            <label className="inline-control">
              <input
                type="checkbox"
                checked={selectedCartItemIds.length === cartItems.length}
                onChange={(e) => selectAll(e.target.checked)}
              />
              Select all
            </label>
            <button disabled={selectedCartItemIds.length === 0} onClick={() => batchRemoveMutation.mutate(selectedCartItemIds)}>
              Remove Selected
            </button>
          </div>
        )}

        {cartItems.map((item) => (
          <div className="list-card" key={item.id}>
            <label className="inline-control">
              <input
                type="checkbox"
                checked={selectedCartItemIds.includes(item.id)}
                onChange={(e) => toggleSelected(item.id, e.target.checked)}
              />
              Select
            </label>
            <h3>{item.title}</h3>
            {item.variantName && <p>Variant: {item.variantName}</p>}
            {item.sku && <p>SKU: {item.sku}</p>}
            <p>Price: {item.price}</p>
            {item.priceChanged && (
              <p className="error-message">Price changed to {item.currentPrice}. Remove and add this item again before checkout.</p>
            )}
            {item.stockWarning && (
              <p className="error-message">Only {item.availableStock} available. Reduce quantity before checkout.</p>
            )}

            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateQuantityMutation.mutate({ id: item.id, quantity: Number(e.target.value) })}
            />

            <button onClick={() => removeMutation.mutate(item.id)}>Remove</button>
          </div>
        ))}

        <h2>Total: {total.toFixed(2)}</h2>
        <button disabled={hasBlockingWarnings} onClick={checkout}>Checkout Selected</button>
      </div>
    </div>
  );
}

export default CartPage;

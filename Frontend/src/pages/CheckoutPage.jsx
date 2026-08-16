import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../api";

function CheckoutPage({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const selectedCartItemIds = searchParams.getAll("cartItemIds").map((id) => Number(id));

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => apiClient.get("/api/cart"),
    refetchOnMount: "always",
    staleTime: 0,
  });

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: () => apiClient.get("/api/addresses"),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      const addresses = addressesQuery.data || [];
      const defaultAddress = addresses.find((address) => address.defaultAddress);
      const shippingAddressId = selectedAddressId || (defaultAddress ? String(defaultAddress.id) : "");
      const params = new URLSearchParams();
      params.set("shippingAddressId", shippingAddressId);
      selectedCartItemIds.forEach((id) => params.append("cartItemIds", id));
      return apiClient.post(`/api/orders/checkout?${params.toString()}`);
    },
    onSuccess: (data) => {
      if (!data.checkoutUrl) {
        alert("No checkout URL returned");
        return;
      }

      window.location.assign(data.checkoutUrl);
    },
    onError: (error) => alert(error.message || "Checkout failed"),
  });

  const cartItems = cartQuery.data || [];
  const checkoutItems = selectedCartItemIds.length > 0
    ? cartItems.filter((item) => selectedCartItemIds.includes(item.id))
    : cartItems;
  const addresses = addressesQuery.data || [];
  const total = checkoutItems.reduce((sum, item) => sum + Number(item.currentPrice ?? item.price) * item.quantity, 0);
  const defaultAddress = addresses.find((address) => address.defaultAddress);
  const effectiveSelectedAddressId = selectedAddressId || (defaultAddress ? String(defaultAddress.id) : "");
  const hasBlockingWarnings = checkoutItems.some((item) => item.stockWarning || item.priceChanged);

  useEffect(() => {
    if (cartQuery.isSuccess && cartItems.length === 0) {
      navigate("/cart?cart=empty", { replace: true });
    }
  }, [cartItems.length, cartQuery.isSuccess, navigate]);

  function placeOrder() {
    if (checkoutItems.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (!effectiveSelectedAddressId) {
      alert("Please choose a shipping address");
      return;
    }

    if (hasBlockingWarnings) {
      alert("Please fix stock or price warnings before checkout");
      return;
    }

    checkoutMutation.mutate();
  }

  return (
    <div>
      <div className="navbar">
        <strong>Checkout</strong>
        <span>{user.email}</span>
        <Link to="/cart">Cart</Link>
        <Link to="/addresses">Addresses</Link>
        <Link to="/orders">Orders</Link>
      </div>

      <div className="page checkout-layout">
        <section>
          <h1>Review Items</h1>

          {cartQuery.isLoading && <p>Loading cart...</p>}
          {cartQuery.isError && <p className="error-message">{cartQuery.error.message}</p>}

          {checkoutItems.map((item) => (
            <div className="list-card" key={item.id}>
              <h3>{item.title}</h3>
              <p>Price: {item.price}</p>
              {item.priceChanged && (
                <p className="error-message">Price changed to {item.currentPrice}. Please return to cart and refresh this item.</p>
              )}
              {item.stockWarning && (
                <p className="error-message">Only {item.availableStock} available. Please return to cart and reduce quantity.</p>
              )}
              <p>Quantity: {item.quantity}</p>
            </div>
          ))}

          {!cartQuery.isLoading && checkoutItems.length === 0 && <p className="error-message">Your cart is empty.</p>}

          <h2>Total: {total.toFixed(2)}</h2>
        </section>

        <section>
          <h1>Shipping Address</h1>

          {addressesQuery.isLoading && <p>Loading addresses...</p>}
          {addressesQuery.isError && <p className="error-message">{addressesQuery.error.message}</p>}

          {addresses.length === 0 && !addressesQuery.isLoading && (
            <p>
              No saved address. <Link to="/addresses">Add one first</Link>.
            </p>
          )}

          {addresses.map((address) => (
            <label className="list-card address-choice" key={address.id}>
              <input
                type="radio"
                name="shippingAddress"
                value={address.id}
                checked={String(effectiveSelectedAddressId) === String(address.id)}
                onChange={(e) => setSelectedAddressId(e.target.value)}
              />
              <span>
                <strong>{address.recipientName}</strong>
                <br />
                {address.phone}
                <br />
                {[address.street, address.city, address.province, address.country, address.postalCode]
                  .filter(Boolean)
                  .join(", ")}
                {address.defaultAddress && (
                  <>
                    <br />
                    <span className="success-message">Default address</span>
                  </>
                )}
              </span>
            </label>
          ))}

          <button disabled={checkoutMutation.isPending || checkoutItems.length === 0 || addresses.length === 0 || hasBlockingWarnings} onClick={placeOrder}>
            Continue to Payment
          </button>
        </section>
      </div>
    </div>
  );
}

export default CheckoutPage;

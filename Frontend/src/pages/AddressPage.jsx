import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api";

const emptyForm = {
  recipientName: "",
  phone: "",
  country: "",
  province: "",
  city: "",
  street: "",
  postalCode: "",
  defaultAddress: false,
};

function AddressPage({ user }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: () => apiClient.get("/api/addresses"),
  });

  const addAddressMutation = useMutation({
    mutationFn: () => apiClient.post("/api/addresses", form),
    onSuccess: () => {
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (error) => alert(error.message || "Add address failed"),
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/api/addresses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (error) => alert(error.message || "Delete address failed"),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id) => apiClient.put(`/api/addresses/${id}/default`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (error) => alert(error.message || "Set default address failed"),
  });

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addAddress() {
    if (!form.recipientName.trim() || !form.phone.trim() || !form.street.trim() || !form.city.trim()) {
      alert("Recipient, phone, city and street are required");
      return;
    }

    addAddressMutation.mutate();
  }

  const addresses = addressesQuery.data || [];

  return (
    <div>
      <div className="navbar">
        <strong>My Addresses</strong>
        <span>{user.email}</span>
        <Link to="/products">Products</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/orders">Orders</Link>
      </div>

      <div className="page">
        <div className="admin-form">
          <h2>Add Address</h2>

          <input placeholder="Recipient name" value={form.recipientName} onChange={(e) => updateForm("recipientName", e.target.value)} />
          <input placeholder="Phone" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />
          <input placeholder="Country" value={form.country} onChange={(e) => updateForm("country", e.target.value)} />
          <input placeholder="Province / State" value={form.province} onChange={(e) => updateForm("province", e.target.value)} />
          <input placeholder="City" value={form.city} onChange={(e) => updateForm("city", e.target.value)} />
          <input placeholder="Street address" value={form.street} onChange={(e) => updateForm("street", e.target.value)} />
          <input placeholder="Postal code" value={form.postalCode} onChange={(e) => updateForm("postalCode", e.target.value)} />

          <label className="inline-control">
            <input
              type="checkbox"
              checked={form.defaultAddress}
              onChange={(e) => updateForm("defaultAddress", e.target.checked)}
            />
            Default address
          </label>

          <button onClick={addAddress}>Add Address</button>
        </div>

        <h2>Saved Addresses</h2>

        {addressesQuery.isLoading && <p>Loading addresses...</p>}
        {addressesQuery.isError && <p className="error-message">{addressesQuery.error.message}</p>}

        {addresses.length === 0 && !addressesQuery.isLoading && <p>No saved addresses yet.</p>}

        {addresses.map((address) => (
          <div className="list-card" key={address.id}>
            <h3>{address.recipientName}</h3>
            <p>{address.phone}</p>
            <p>
              {[address.street, address.city, address.province, address.country, address.postalCode]
                .filter(Boolean)
                .join(", ")}
            </p>
            {address.defaultAddress && <p className="success-message">Default address</p>}
            {!address.defaultAddress && (
              <button onClick={() => setDefaultMutation.mutate(address.id)}>Set Default</button>
            )}
            <button onClick={() => deleteAddressMutation.mutate(address.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AddressPage;

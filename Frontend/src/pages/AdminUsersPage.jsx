import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api";

const PAGE_SIZE = 10;

function buildUserQuery(filters) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("size", String(PAGE_SIZE));
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.role) params.set("role", filters.role);
  return `/api/admin/users?${params.toString()}`;
}

function AdminUsersPage({ user }) {
  const queryClient = useQueryClient();
  const [draftFilters, setDraftFilters] = useState({ keyword: "", role: "" });
  const [filters, setFilters] = useState({ ...draftFilters, page: 0 });

  const usersQuery = useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: () => apiClient.get(buildUserQuery(filters)),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => apiClient.put(`/api/admin/users/${id}/role?role=${role}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
    onError: (error) => alert(error.message || "Update role failed"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/api/admin/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
    onError: (error) => alert(error.message || "Delete user failed"),
  });

  const userPage = usersQuery.data || { content: [], number: 0, totalPages: 0, totalElements: 0, first: true, last: true };
  const users = userPage.content || [];

  function applyFilters() {
    setFilters({ keyword: draftFilters.keyword.trim(), role: draftFilters.role, page: 0 });
  }

  function clearFilters() {
    const cleared = { keyword: "", role: "" };
    setDraftFilters(cleared);
    setFilters({ ...cleared, page: 0 });
  }

  function goToPage(page) {
    setFilters((current) => ({ ...current, page }));
  }

  return (
    <div>
      <div className="navbar">
        <strong>Admin Users</strong>
        <Link to="/admin/dashboard">Dashboard</Link>
        <Link to="/admin">Products</Link>
        <Link to="/admin/orders">Orders</Link>
        <Link to="/products">Storefront</Link>
      </div>

      <div className="page">
        <div className="admin-header">
          <h1>User Management</h1>
          <p>Logged in as ADMIN: {user.email}</p>
        </div>

        <div className="filter-bar">
          <input placeholder="Email or username" value={draftFilters.keyword} onChange={(e) => setDraftFilters((current) => ({ ...current, keyword: e.target.value }))} />
          <select value={draftFilters.role} onChange={(e) => setDraftFilters((current) => ({ ...current, role: e.target.value }))}>
            <option value="">All roles</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button onClick={applyFilters}>Apply</button>
          <button onClick={clearFilters}>Clear</button>
        </div>

        {usersQuery.isLoading && <p>Loading users...</p>}
        {usersQuery.isError && <p className="error-message">{usersQuery.error.message}</p>}
        {!usersQuery.isLoading && !usersQuery.isError && <p>Showing {users.length} of {userPage.totalElements || 0} users</p>}

        {users.map((managedUser) => (
          <div className="list-card admin-user-row" key={managedUser.id}>
            <div>
              <h3>{managedUser.email}</h3>
              <p>{managedUser.username || "No username"}</p>
            </div>
            <select value={managedUser.role} onChange={(e) => updateRoleMutation.mutate({ id: managedUser.id, role: e.target.value })}>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button disabled={managedUser.email === user.email} onClick={() => deleteUserMutation.mutate(managedUser.id)}>Delete</button>
          </div>
        ))}

        <div className="pagination-bar">
          <button disabled={userPage.first} onClick={() => goToPage(userPage.number - 1)}>Previous</button>
          <span>Page {(userPage.number || 0) + 1} of {userPage.totalPages || 1}</span>
          <button disabled={userPage.last || userPage.totalPages === 0} onClick={() => goToPage(userPage.number + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}

export default AdminUsersPage;

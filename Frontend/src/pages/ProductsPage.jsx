import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api";

const PAGE_SIZE = 12;

function buildProductQuery(filters) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("size", String(PAGE_SIZE));
  params.set("sort", filters.sort);

  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.attributeName && filters.attributeValue) {
    params.append("attributes", `${filters.attributeName}:${filters.attributeValue}`);
  }

  return `/api/products/browse?${params.toString()}`;
}

function getProductImage(product) {
  return product.imageUrl || product.images?.[0]?.imageUrl || "";
}

function ProductsPage({ user, setUser }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draftFilters, setDraftFilters] = useState({
    keyword: "",
    categoryId: "",
    attributeName: "",
    attributeValue: "",
    minPrice: "",
    maxPrice: "",
    sort: "createdDesc",
  });
  const [filters, setFilters] = useState({ ...draftFilters, page: 0 });

  const productsQuery = useQuery({
    queryKey: ["products", "browse", filters],
    queryFn: () => apiClient.get(buildProductQuery(filters)),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get("/api/categories"),
  });

  const addToCartMutation = useMutation({
    mutationFn: (product) => {
      const cartItem = {
        productId: product.id,
        title: product.title,
        price: product.price,
        quantity: 1,
      };

      return apiClient.post("/api/cart", cartItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      alert("Added to cart");
    },
    onError: () => alert("Add to cart failed"),
  });

  function logout() {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("token");
    setUser(null);
  }

  function updateDraftFilter(field, value) {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  }

  function changeSort(value) {
    const nextFilters = {
      keyword: draftFilters.keyword.trim(),
      categoryId: draftFilters.categoryId,
      attributeName: draftFilters.attributeName.trim(),
      attributeValue: draftFilters.attributeValue.trim(),
      minPrice: draftFilters.minPrice,
      maxPrice: draftFilters.maxPrice,
      sort: value,
      page: 0,
    };

    setDraftFilters((current) => ({ ...current, sort: value }));
    setFilters(nextFilters);
  }

  function applyFilters() {
    setFilters({
      keyword: draftFilters.keyword.trim(),
      categoryId: draftFilters.categoryId,
      attributeName: draftFilters.attributeName.trim(),
      attributeValue: draftFilters.attributeValue.trim(),
      minPrice: draftFilters.minPrice,
      maxPrice: draftFilters.maxPrice,
      sort: draftFilters.sort,
      page: 0,
    });
  }

  function clearFilters() {
    const cleared = { keyword: "", categoryId: "", attributeName: "", attributeValue: "", minPrice: "", maxPrice: "", sort: "createdDesc" };
    setDraftFilters(cleared);
    setFilters({ ...cleared, page: 0 });
  }

  function goToPage(page) {
    setFilters((current) => ({ ...current, page }));
  }

  function addProductToCart(product) {
    if (!user) {
      navigate("/login");
      return;
    }

    addToCartMutation.mutate(product);
  }

  const productPage = productsQuery.data || { content: [], number: 0, totalPages: 0, totalElements: 0, first: true, last: true };
  const products = productPage.content || [];
  const categories = categoriesQuery.data || [];

  return (
    <div>
      <div className="navbar">
        <strong>Mini ECommerce</strong>
        {user ? <span>{user.email}</span> : <span>Guest</span>}
        <Link to="/cart">Cart</Link>
        {user && <Link to="/orders">Orders</Link>}
        {user?.role === "ADMIN" && <Link to="/admin">Admin</Link>}
        {user ? <button onClick={logout}>Logout</button> : <Link to="/login">Login</Link>}
        {!user && <Link to="/register">Register</Link>}
      </div>

      <div className="page">
        <h1>Products</h1>

        <div className="filter-bar">
          <input placeholder="Search products" value={draftFilters.keyword} onChange={(e) => updateDraftFilter("keyword", e.target.value)} />
          <select value={draftFilters.categoryId} onChange={(e) => updateDraftFilter("categoryId", e.target.value)}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <input placeholder="Attribute name" value={draftFilters.attributeName} onChange={(e) => updateDraftFilter("attributeName", e.target.value)} />
          <input placeholder="Attribute value" value={draftFilters.attributeValue} onChange={(e) => updateDraftFilter("attributeValue", e.target.value)} />
          <input type="number" min="0" placeholder="Min price" value={draftFilters.minPrice} onChange={(e) => updateDraftFilter("minPrice", e.target.value)} />
          <input type="number" min="0" placeholder="Max price" value={draftFilters.maxPrice} onChange={(e) => updateDraftFilter("maxPrice", e.target.value)} />
          <select value={draftFilters.sort} onChange={(e) => changeSort(e.target.value)}>
            <option value="createdDesc">Newest</option>
            <option value="priceAsc">Price low to high</option>
            <option value="priceDesc">Price high to low</option>
            <option value="titleAsc">Title A-Z</option>
            <option value="stockDesc">Stock high to low</option>
          </select>
          <button onClick={applyFilters}>Apply</button>
          <button onClick={clearFilters}>Clear</button>
        </div>

        {productsQuery.isLoading && <p>Loading products...</p>}
        {productsQuery.isError && <p className="error-message">{productsQuery.error.message}</p>}

        {!productsQuery.isLoading && !productsQuery.isError && (
          <p>Showing {products.length} of {productPage.totalElements || 0} products</p>
        )}

        <div className="product-grid">
          {products.map((product) => (
            <div className="card" key={product.id}>
              <Link to={`/products/${product.id}`}>
                <h3>{product.title}</h3>
              </Link>

              <Link to={`/products/${product.id}`}>
                <img src={getProductImage(product)} alt={product.title} />
              </Link>

              <p>Category: {product.category}</p>
              {(product.attributes || []).slice(0, 3).map((attribute) => (
                <p key={attribute.id || attribute.attributeName + attribute.attributeValue}>
                  {attribute.attributeName}: {attribute.attributeValue}
                </p>
              ))}
              <p>{product.description}</p>
              <p>Price: {product.price}</p>
              <p>Available Stock: {product.availableStock ?? product.stock}</p>

              <button onClick={() => addProductToCart(product)}>Add to Cart</button>
            </div>
          ))}
        </div>

        <div className="pagination-bar">
          <button disabled={productPage.first} onClick={() => goToPage(productPage.number - 1)}>Previous</button>
          <span>Page {(productPage.number || 0) + 1} of {productPage.totalPages || 1}</span>
          <button disabled={productPage.last || productPage.totalPages === 0} onClick={() => goToPage(productPage.number + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;

import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api";

const emptyVariant = { sku: "", optionName: "", optionValue: "", price: "", stock: "", active: true };
const emptyAttribute = { attributeName: "", attributeValue: "" };
const ADMIN_PRODUCT_PAGE_SIZE = 8;

function buildAdminProductQuery(filters) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("size", String(ADMIN_PRODUCT_PAGE_SIZE));
  params.set("sort", filters.sort);
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.lowStockOnly) params.set("lowStockOnly", "true");
  return `/api/admin/products?${params.toString()}`;
}

function AdminPage({ user }) {
  const queryClient = useQueryClient();
  const [newProductImages, setNewProductImages] = useState([]);
  const [form, setForm] = useState({
    title: "",
    category: "",
    categoryId: "",
    description: "",
    price: "",
    imageUrl: "",
    stock: "",
    variants: [{ ...emptyVariant }],
    attributes: [{ ...emptyAttribute }],
  });
  const [categoryForm, setCategoryForm] = useState({ name: "", parentId: "", sortOrder: 0, active: true });
  const [draftFilters, setDraftFilters] = useState({ keyword: "", categoryId: "", lowStockOnly: false, sort: "createdDesc" });
  const [filters, setFilters] = useState({ ...draftFilters, page: 0 });

  const productsQuery = useQuery({
    queryKey: ["products", "admin", filters],
    queryFn: () => apiClient.get(buildAdminProductQuery(filters)),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", "admin"],
    queryFn: () => apiClient.get("/api/categories?activeOnly=false"),
  });

  const refreshProducts = () => queryClient.invalidateQueries({ queryKey: ["products", "admin"] });
  const refreshCategories = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const uploadImageMutation = useMutation({
    mutationFn: ({ productId, file }) => {
      const formData = new FormData();
      formData.append("image", file);
      return apiClient.postForm(`/api/products/${productId}/image`, formData);
    },
    onSuccess: refreshProducts,
  });

  const addProductMutation = useMutation({
    mutationFn: async () => {
      const newProduct = await apiClient.post("/api/products", {
        title: form.title,
        category: form.category,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        description: form.description,
        price: Number(form.price),
        imageUrl: "",
        stock: Number(form.stock),
        variants: normalizeVariants(form.variants, Number(form.price)),
        attributes: normalizeAttributes(form.attributes),
        images: [],
      });

      for (const file of newProductImages) {
        await uploadImageMutation.mutateAsync({ productId: newProduct.id, file });
      }

      return newProduct;
    },
    onSuccess: () => {
      alert("Product added");
      setForm({ title: "", category: "", categoryId: "", description: "", price: "", imageUrl: "", stock: "", variants: [{ ...emptyVariant }], attributes: [{ ...emptyAttribute }] });
      setNewProductImages([]);
      refreshProducts();
    },
    onError: () => alert("Add product failed"),
  });

  const addCategoryMutation = useMutation({
    mutationFn: () => apiClient.post("/api/categories", {
      name: categoryForm.name,
      parentId: categoryForm.parentId ? Number(categoryForm.parentId) : null,
      sortOrder: Number(categoryForm.sortOrder) || 0,
      active: categoryForm.active,
    }),
    onSuccess: () => {
      setCategoryForm({ name: "", parentId: "", sortOrder: 0, active: true });
      refreshCategories();
    },
    onError: (error) => alert(error.message || "Add category failed"),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (category) => apiClient.put(`/api/categories/${category.id}`, category),
    onSuccess: refreshCategories,
    onError: (error) => alert(error.message || "Update category failed"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/api/categories/${id}`),
    onSuccess: refreshCategories,
    onError: (error) => alert(error.message || "Delete category failed"),
  });

  function updateForm(field, value) {
    setForm({ ...form, [field]: value });
  }

  function applyFilters() {
    setFilters({
      keyword: draftFilters.keyword.trim(),
      categoryId: draftFilters.categoryId,
      lowStockOnly: draftFilters.lowStockOnly,
      sort: draftFilters.sort,
      page: 0,
    });
  }

  function clearFilters() {
    const cleared = { keyword: "", categoryId: "", lowStockOnly: false, sort: "createdDesc" };
    setDraftFilters(cleared);
    setFilters({ ...cleared, page: 0 });
  }

  function goToPage(page) {
    setFilters((current) => ({ ...current, page }));
  }

  function normalizeVariants(variants, fallbackPrice) {
    return (variants || [])
      .filter((variant) => variant.sku || variant.optionName || variant.optionValue)
      .map((variant) => ({
        ...variant,
        price: variant.price === "" || variant.price == null ? fallbackPrice : Number(variant.price),
        stock: variant.stock === "" || variant.stock == null ? 0 : Number(variant.stock),
        active: variant.active !== false,
      }));
  }

  function normalizeAttributes(attributes) {
    return (attributes || [])
      .filter((attribute) => attribute.attributeName || attribute.attributeValue)
      .map((attribute) => ({
        ...attribute,
        attributeName: (attribute.attributeName || "").trim(),
        attributeValue: (attribute.attributeValue || "").trim(),
      }))
      .filter((attribute) => attribute.attributeName && attribute.attributeValue);
  }

  function updateFormVariant(index, field, value) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => (
        variantIndex === index ? { ...variant, [field]: value } : variant
      )),
    }));
  }

  function addFormVariant() {
    setForm((current) => ({ ...current, variants: [...current.variants, { ...emptyVariant }] }));
  }

  function removeFormVariant(index) {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  }

  function updateFormAttribute(index, field, value) {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, attributeIndex) => (
        attributeIndex === index ? { ...attribute, [field]: value } : attribute
      )),
    }));
  }

  function addFormAttribute() {
    setForm((current) => ({ ...current, attributes: [...current.attributes, { ...emptyAttribute }] }));
  }

  function removeFormAttribute(index) {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.filter((_, attributeIndex) => attributeIndex !== index),
    }));
  }

  function addProduct() {
    if (!form.title.trim() || !form.category.trim() || !form.description.trim()) {
      alert("Title, category and description are required");
      return;
    }

    if (Number(form.price) <= 0) {
      alert("Price must be greater than 0");
      return;
    }

    if (Number(form.stock) < 0) {
      alert("Stock cannot be negative");
      return;
    }

    addProductMutation.mutate();
  }

  const productPage = productsQuery.data || { content: [], number: 0, totalPages: 0, totalElements: 0, first: true, last: true };
  const categories = categoriesQuery.data || [];
  const products = productPage.content || [];

  return (
    <div>
      <div className="navbar">
        <strong>Admin Products</strong>
        <Link to="/admin/dashboard">Dashboard</Link>
        <Link to="/admin/orders">Orders</Link>
        <Link to="/admin/users">Users</Link>
        <Link to="/products">Storefront</Link>
      </div>

      <div className="page">
        <div className="admin-header">
          <h1>Product Management</h1>
          <p>Logged in as ADMIN: {user.email}</p>
        </div>

        <div className="admin-form">
          <h2>Add Product</h2>

          <div className="field-row">
            <label className="field">
              Title
              <input placeholder="Title" value={form.title} onChange={(e) => updateForm("title", e.target.value)} />
            </label>
            <label className="field">
              Category (text label)
              <input placeholder="Category" value={form.category} onChange={(e) => updateForm("category", e.target.value)} />
            </label>
            <label className="field">
              Category record (optional)
              <select value={form.categoryId} onChange={(e) => updateForm("categoryId", e.target.value)}>
                <option value="">No category record</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Price
              <input type="number" placeholder="Price" value={form.price} onChange={(e) => updateForm("price", e.target.value)} />
            </label>
            <label className="field">
              Stock
              <input type="number" placeholder="Stock" value={form.stock} onChange={(e) => updateForm("stock", e.target.value)} />
            </label>
            <label className="field">
              Images
              <input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(e) => setNewProductImages(Array.from(e.target.files))} />
            </label>
          </div>

          <label className="field">
            Description
            <input placeholder="Description" value={form.description} onChange={(e) => updateForm("description", e.target.value)} />
          </label>

          <div className="form-section">
            <h3>Variants</h3>
            {form.variants.map((variant, index) => (
              <div className="variant-row" key={index}>
                <input placeholder="SKU" value={variant.sku} onChange={(e) => updateFormVariant(index, "sku", e.target.value)} />
                <input placeholder="Option name" value={variant.optionName} onChange={(e) => updateFormVariant(index, "optionName", e.target.value)} />
                <input placeholder="Option value" value={variant.optionValue} onChange={(e) => updateFormVariant(index, "optionValue", e.target.value)} />
                <input type="number" placeholder="Variant price" value={variant.price} onChange={(e) => updateFormVariant(index, "price", e.target.value)} />
                <input type="number" placeholder="Variant stock" value={variant.stock} onChange={(e) => updateFormVariant(index, "stock", e.target.value)} />
                <button onClick={() => removeFormVariant(index)}>Remove</button>
              </div>
            ))}
            <button onClick={addFormVariant}>Add Variant</button>
          </div>

          <div className="form-section">
            <h3>Attributes</h3>
            {form.attributes.map((attribute, index) => (
              <div className="variant-row" key={index}>
                <input placeholder="Attribute name" value={attribute.attributeName} onChange={(e) => updateFormAttribute(index, "attributeName", e.target.value)} />
                <input placeholder="Attribute value" value={attribute.attributeValue} onChange={(e) => updateFormAttribute(index, "attributeValue", e.target.value)} />
                <button onClick={() => removeFormAttribute(index)}>Remove</button>
              </div>
            ))}
            <button onClick={addFormAttribute}>Add Attribute</button>
          </div>

          <button onClick={addProduct}>Add Product</button>
        </div>

        <div className="admin-form">
          <h2>Categories</h2>

          <div className="field-row">
            <label className="field">
              Category name
              <input placeholder="Category name" value={categoryForm.name} onChange={(e) => setCategoryForm((current) => ({ ...current, name: e.target.value }))} />
            </label>
            <label className="field">
              Parent category
              <select value={categoryForm.parentId} onChange={(e) => setCategoryForm((current) => ({ ...current, parentId: e.target.value }))}>
                <option value="">No parent</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Sort order
              <input type="number" placeholder="Sort order" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm((current) => ({ ...current, sortOrder: e.target.value }))} />
            </label>
          </div>

          <label className="inline-control">
            <input type="checkbox" checked={categoryForm.active} onChange={(e) => setCategoryForm((current) => ({ ...current, active: e.target.checked }))} /> Active
          </label>
          <button onClick={() => addCategoryMutation.mutate()}>Add Category</button>

          <div className="form-section">
            {categories.map((category) => (
              <div className="compact-row" key={category.id}>
                <input value={category.name} onChange={(e) => updateCategoryMutation.mutate({ ...category, name: e.target.value })} />
                <span>Parent: {category.parentId || "None"}</span>
                <span>{category.active ? "Active" : "Inactive"}</span>
                <button onClick={() => updateCategoryMutation.mutate({ ...category, active: !category.active })}>
                  {category.active ? "Disable" : "Enable"}
                </button>
                <button onClick={() => deleteCategoryMutation.mutate(category.id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        <h2>Manage Products</h2>

        <div className="filter-bar">
          <input placeholder="Search products" value={draftFilters.keyword} onChange={(e) => setDraftFilters((current) => ({ ...current, keyword: e.target.value }))} />
          <select value={draftFilters.categoryId} onChange={(e) => setDraftFilters((current) => ({ ...current, categoryId: e.target.value }))}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select value={draftFilters.sort} onChange={(e) => setDraftFilters((current) => ({ ...current, sort: e.target.value }))}>
            <option value="createdDesc">Newest</option>
            <option value="priceAsc">Price low to high</option>
            <option value="priceDesc">Price high to low</option>
            <option value="stockAsc">Stock low to high</option>
            <option value="stockDesc">Stock high to low</option>
          </select>
          <label className="inline-control">
            <input type="checkbox" checked={draftFilters.lowStockOnly} onChange={(e) => setDraftFilters((current) => ({ ...current, lowStockOnly: e.target.checked }))} /> Low stock
          </label>
          <button onClick={applyFilters}>Apply</button>
          <button onClick={clearFilters}>Clear</button>
        </div>

        {productsQuery.isLoading && <p>Loading products...</p>}
        {productsQuery.isError && <p className="error-message">{productsQuery.error.message}</p>}
        {!productsQuery.isLoading && !productsQuery.isError && <p>Showing {products.length} of {productPage.totalElements || 0} products</p>}

        <div className="admin-grid">
          {products.map((product) => {
            const thumbnail = product.imageUrl || product.images?.[0]?.imageUrl;
            const isLowStock = product.availableStock != null && product.availableStock <= 5;

            return (
              <Link className="card admin-product-summary" to={`/admin/products/${product.id}`} key={product.id}>
                {thumbnail && <img className="product-image-main" src={thumbnail} alt={product.title} />}

                <h3>{product.title}</h3>
                <p className="admin-product-summary-category">{product.category || "Uncategorized"}</p>

                <div className="admin-product-summary-stats">
                  <span>${Number(product.price).toFixed(2)}</span>
                  <span className={isLowStock ? "status-badge order-status-cancelled" : "status-badge"}>
                    Stock: {product.availableStock ?? product.stock}
                  </span>
                </div>

                <span className="admin-product-summary-edit">Click to edit &rarr;</span>
              </Link>
            );
          })}
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

export default AdminPage;

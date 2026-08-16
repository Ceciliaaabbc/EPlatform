import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api";

const emptyVariant = { sku: "", optionName: "", optionValue: "", price: "", stock: "", active: true };
const emptyAttribute = { attributeName: "", attributeValue: "" };

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

function AdminProductEditPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(null);

  const productQuery = useQuery({
    queryKey: ["products", "admin", "detail", id],
    queryFn: () => apiClient.get(`/api/products/${id}`),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", "admin"],
    queryFn: () => apiClient.get("/api/categories?activeOnly=false"),
  });

  // Load the fetched product into local editable state once, and again
  // whenever you navigate to a different product id.
  useEffect(() => {
    if (productQuery.data) {
      setDraft({
        ...productQuery.data,
        attributes: productQuery.data.attributes || [{ ...emptyAttribute }],
      });
    }
  }, [productQuery.data, id]);

  const refreshProducts = () => {
    queryClient.invalidateQueries({ queryKey: ["products", "admin"] });
    queryClient.invalidateQueries({ queryKey: ["products", "admin", "detail", id] });
  };

  const uploadImageMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append("image", file);
      return apiClient.postForm(`/api/products/${id}/image`, formData);
    },
    onSuccess: () => {
      alert("Image uploaded");
      refreshProducts();
    },
    onError: () => alert("Image upload failed"),
  });

  const updateProductMutation = useMutation({
    mutationFn: (product) => apiClient.put(`/api/products/${id}`, product),
    onSuccess: () => {
      alert("Product updated");
      refreshProducts();
    },
    onError: () => alert("Update failed"),
  });

  const deleteProductMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/products/${id}`),
    onSuccess: () => {
      refreshProducts();
      navigate("/admin");
    },
    onError: () => alert("Delete failed"),
  });

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateVariantField(index, field, value) {
    setDraft((current) => ({
      ...current,
      variants: (current.variants || []).map((variant, variantIndex) => (
        variantIndex === index ? { ...variant, [field]: value } : variant
      )),
    }));
  }

  function addVariant() {
    setDraft((current) => ({ ...current, variants: [...(current.variants || []), { ...emptyVariant }] }));
  }

  function removeVariant(index) {
    setDraft((current) => ({
      ...current,
      variants: (current.variants || []).filter((_, variantIndex) => variantIndex !== index),
    }));
  }

  function updateAttributeField(index, field, value) {
    setDraft((current) => ({
      ...current,
      attributes: (current.attributes || []).map((attribute, attributeIndex) => (
        attributeIndex === index ? { ...attribute, [field]: value } : attribute
      )),
    }));
  }

  function addAttribute() {
    setDraft((current) => ({ ...current, attributes: [...(current.attributes || []), { ...emptyAttribute }] }));
  }

  function saveChanges() {
    updateProductMutation.mutate({
      ...draft,
      price: Number(draft.price),
      stock: Number(draft.stock),
      variants: normalizeVariants(draft.variants, Number(draft.price)),
      attributes: normalizeAttributes(draft.attributes),
      images: draft.images || [],
    });
  }

  function deleteProduct() {
    if (window.confirm("Delete this product? This cannot be undone.")) {
      deleteProductMutation.mutate();
    }
  }

  const categories = categoriesQuery.data || [];

  // `images` is the source of truth; fall back to the legacy single
  // `imageUrl` field only if there's no images[] entry. The first image is
  // the large main photo, the rest go in the thumbnail strip below it.
  const images = draft?.images && draft.images.length > 0
    ? draft.images
    : (draft?.imageUrl ? [{ imageUrl: draft.imageUrl }] : []);
  const mainImage = images[0]?.imageUrl;
  const extraImages = images.slice(1);

  return (
    <div>
      <div className="navbar">
        <strong>Edit Product</strong>
        <Link to="/admin">Products</Link>
        <Link to="/admin/dashboard">Dashboard</Link>
        <Link to="/admin/orders">Orders</Link>
        <Link to="/admin/users">Users</Link>
        <Link to="/products">Storefront</Link>
      </div>

      <div className="page">
        <div className="admin-header">
          <h1>Edit Product</h1>
          <p>Logged in as ADMIN: {user.email}</p>
        </div>

        <p><Link to="/admin">&larr; Back to product list</Link></p>

        {productQuery.isLoading && <p>Loading product...</p>}
        {productQuery.isError && <p className="error-message">{productQuery.error.message}</p>}

        {draft && (
          <div className="admin-form product-edit-form">
            {mainImage && <img className="product-image-main" src={mainImage} alt={draft.title} />}

            {extraImages.length > 0 && (
              <div className="thumbnail-row">
                {extraImages.map((image) => (
                  <img className="admin-thumbnail" src={image.imageUrl} alt={draft.title} key={image.id || image.imageUrl} />
                ))}
              </div>
            )}

            <label className="field">
              Upload image(s)
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach((file) => uploadImageMutation.mutate(file));
                }}
              />
            </label>

            <hr className="card-divider" />

            <label className="field">
              Title
              <input value={draft.title || ""} onChange={(e) => updateField("title", e.target.value)} />
            </label>
            <label className="field">
              Category (text label)
              <input value={draft.category || ""} onChange={(e) => updateField("category", e.target.value)} />
            </label>
            <label className="field">
              Category record
              <select value={draft.categoryId || ""} onChange={(e) => updateField("categoryId", e.target.value ? Number(e.target.value) : null)}>
                <option value="">No category record</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Description
              <input value={draft.description || ""} onChange={(e) => updateField("description", e.target.value)} />
            </label>
            <div className="field-row">
              <label className="field">
                Price
                <input type="number" value={draft.price ?? ""} onChange={(e) => updateField("price", Number(e.target.value))} />
              </label>
              <label className="field">
                Stock
                <input type="number" value={draft.stock ?? ""} onChange={(e) => updateField("stock", Number(e.target.value))} />
              </label>
            </div>
            <label className="field">
              Image URL (legacy/fallback)
              <input value={draft.imageUrl || ""} onChange={(e) => updateField("imageUrl", e.target.value)} />
            </label>

            <div className="form-section">
              <h3>Variants</h3>
              {(draft.variants || []).map((variant, index) => (
                <div className="variant-row" key={variant.id || index}>
                  <input placeholder="SKU" value={variant.sku || ""} onChange={(e) => updateVariantField(index, "sku", e.target.value)} />
                  <input placeholder="Option name" value={variant.optionName || ""} onChange={(e) => updateVariantField(index, "optionName", e.target.value)} />
                  <input placeholder="Option value" value={variant.optionValue || ""} onChange={(e) => updateVariantField(index, "optionValue", e.target.value)} />
                  <input type="number" placeholder="Price" value={variant.price ?? ""} onChange={(e) => updateVariantField(index, "price", e.target.value)} />
                  <input type="number" placeholder="Stock" value={variant.stock ?? ""} onChange={(e) => updateVariantField(index, "stock", e.target.value)} />
                  <label>
                    <input type="checkbox" checked={variant.active !== false} onChange={(e) => updateVariantField(index, "active", e.target.checked)} /> Active
                  </label>
                  <button onClick={() => removeVariant(index)}>Remove</button>
                </div>
              ))}
              <button onClick={addVariant}>Add Variant</button>
            </div>

            <div className="form-section">
              <h3>Attributes</h3>
              {(draft.attributes || []).map((attribute, index) => (
                <div className="variant-row" key={index}>
                  <input placeholder="Attribute name" value={attribute.attributeName || ""} onChange={(e) => updateAttributeField(index, "attributeName", e.target.value)} />
                  <input placeholder="Attribute value" value={attribute.attributeValue || ""} onChange={(e) => updateAttributeField(index, "attributeValue", e.target.value)} />
                </div>
              ))}
              <button onClick={addAttribute}>Add Attribute</button>
            </div>

            <hr className="card-divider" />

            <div className="admin-actions">
              <button disabled={updateProductMutation.isPending} onClick={saveChanges}>Save Changes</button>
              <button disabled={deleteProductMutation.isPending} onClick={deleteProduct}>Delete Product</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminProductEditPage;

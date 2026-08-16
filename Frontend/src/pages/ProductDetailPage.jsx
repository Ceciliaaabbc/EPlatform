import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api";

function ProductDetailPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState("");

  const productQuery = useQuery({
    queryKey: ["product", id],
    queryFn: () => apiClient.get(`/api/products/${id}`),
  });

  const reviewsQuery = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => apiClient.get(`/api/reviews?productId=${id}`),
  });

  const addToCartMutation = useMutation({
    mutationFn: ({ product, variant }) => {
      const cartItem = {
        productId: product.id,
        variantId: variant?.id || null,
        sku: variant?.sku || null,
        variantName: formatVariantName(variant),
        title: product.title,
        price: variant?.price ?? product.price,
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

  const addReviewMutation = useMutation({
    mutationFn: () =>
      apiClient.post("/api/reviews", {
        productId: Number(id),
        rating: Number(rating),
        comment,
      }),
    onSuccess: () => {
      setComment("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ["reviews", id] });
    },
    onError: () => alert("Add review failed"),
  });

  const product = productQuery.data;

  function addReview() {
    if (!user) {
      alert("Please login before writing a review");
      return;
    }

    if (!comment.trim()) {
      alert("Please write a comment");
      return;
    }

    if (comment.length < 3) {
      alert("Review must be at least 3 characters");
      return;
    }

    addReviewMutation.mutate();
  }

  if (productQuery.isLoading) {
    return <p>Loading product...</p>;
  }

  if (productQuery.isError) {
    return <p className="error-message">{productQuery.error.message}</p>;
  }

  const reviews = reviewsQuery.data || [];
  const images = product.images?.length ? product.images : product.imageUrl ? [{ imageUrl: product.imageUrl }] : [];
  const activeVariants = (product.variants || []).filter((variant) => variant.active !== false);
  const effectiveSelectedVariantId = selectedVariantId || String(activeVariants[0]?.id || "");
  const selectedVariant = activeVariants.find((variant) => String(variant.id) === String(effectiveSelectedVariantId));
  const displayPrice = selectedVariant?.price ?? product.price;
  const displayStock = selectedVariant?.availableStock ?? selectedVariant?.stock ?? product.availableStock ?? product.stock;
  const heroImage = selectedImageUrl || images[0]?.imageUrl || product.imageUrl;

  function formatVariantName(variant) {
    if (!variant) return null;
    return [variant.optionName, variant.optionValue].filter(Boolean).join(": ") || variant.sku || null;
  }

  function addCurrentSelectionToCart() {
    if (!user) {
      navigate("/login");
      return;
    }

    if (activeVariants.length > 0 && !selectedVariant) {
      alert("Please choose a variant");
      return;
    }
    addToCartMutation.mutate({ product, variant: selectedVariant });
  }

  return (
    <div>
      <div className="navbar">
        <strong>Mini ECommerce</strong>
        <Link to="/products">Products</Link>
        <Link to="/cart">Cart</Link>
        {user && <Link to="/orders">Orders</Link>}
        {user ? <span>{user.email}</span> : <Link to="/login">Login</Link>}
      </div>

      <div className="page">
        <div className="card detail-layout">
          <div>
            <div className="detail-image-frame">
              <img className="detail-image" src={heroImage} alt={product.title} />
            </div>
            {images.length > 1 && (
              <div className="thumbnail-row">
                {images.map((image) => (
                  <button
                    className={image.imageUrl === heroImage ? "thumbnail-button active" : "thumbnail-button"}
                    key={image.id || image.imageUrl}
                    onClick={() => setSelectedImageUrl(image.imageUrl)}
                  >
                    <img src={image.imageUrl} alt={product.title} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1>{product.title}</h1>
            <p>Category: {product.category}</p>
            <p>{product.description}</p>
            <h2>Price: {displayPrice}</h2>
            <p>Available Stock: {displayStock}</p>

            {activeVariants.length > 0 && (
              <div className="variant-picker">
                <h3>Choose Variant</h3>
                {activeVariants.map((variant) => (
                  <button
                    className={String(effectiveSelectedVariantId) === String(variant.id) ? "variant-option active" : "variant-option"}
                    key={variant.id}
                    onClick={() => setSelectedVariantId(String(variant.id))}
                  >
                    <strong>{formatVariantName(variant)}</strong>
                    <span>{variant.sku}</span>
                    <span>{variant.price ?? product.price}</span>
                  </button>
                ))}
              </div>
            )}

            <button disabled={addToCartMutation.isPending || Number(displayStock) <= 0} onClick={addCurrentSelectionToCart}>Add to Cart</button>
          </div>
        </div>

        <div className="review-box">
          <h2>Reviews</h2>

          <select value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>

          <br />

          <textarea placeholder="Write your review" value={comment} onChange={(e) => setComment(e.target.value)} />

          <br />

          <button onClick={addReview}>Submit Review</button>

          {reviews.map((review) => (
            <div className="review-item" key={review.id}>
              <p><strong>{review.userEmail}</strong></p>
              <p>Rating: {review.rating}/5</p>
              <p>{review.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;

package com.ecommerce.product;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

// Redis here is a best-effort cache, not a source of truth. Every method
// swallows Redis errors (connection refused, DNS failure, timeout, etc.)
// so that a misconfigured or unreachable cache never breaks the actual
// product browsing/editing flows, which all still work fine straight from
// Postgres. See management.health.redis.enabled=false in application.yml
// for the matching health-check decision.
@Service
public class ProductCacheService {

    private static final Logger log = LoggerFactory.getLogger(ProductCacheService.class);

    private static final String ALL_PRODUCTS_KEY = "products:all";
    private static final String PRODUCT_DETAIL_KEY_PREFIX = "products:";

    private final RedisTemplate<String, Object> redisTemplate;

    public ProductCacheService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void cacheAllProducts(List<Product> products) {
        runQuietly(() -> redisTemplate.opsForValue().set(
                ALL_PRODUCTS_KEY,
                products,
                Duration.ofMinutes(10)
        ));
    }

    public Object getAllProductsFromCache() {
        return getFromCache(ALL_PRODUCTS_KEY);
    }

    public void cacheProduct(Product product) {
        runQuietly(() -> redisTemplate.opsForValue().set(
                PRODUCT_DETAIL_KEY_PREFIX + product.getId(),
                product,
                Duration.ofMinutes(10)
        ));
    }

    public Object getProductFromCache(Long id) {
        return getFromCache(PRODUCT_DETAIL_KEY_PREFIX + id);
    }

    public void clearAllProductsCache() {
        runQuietly(() -> redisTemplate.delete(ALL_PRODUCTS_KEY));
    }

    public void clearProductCache(Long id) {
        runQuietly(() -> redisTemplate.delete(PRODUCT_DETAIL_KEY_PREFIX + id));
    }

    public void clearProductCaches(Long id) {
        clearAllProductsCache();
        clearProductCache(id);
    }

    private Object getFromCache(String key) {
        try {
            return redisTemplate.opsForValue().get(key);
        } catch (RuntimeException ex) {
            log.warn("Product cache read failed for key '{}', falling back to database: {}", key, ex.getMessage());
            try {
                redisTemplate.delete(key);
            } catch (RuntimeException ignored) {
                // Redis is already unreachable; nothing more to do.
            }
            return null;
        }
    }

    private void runQuietly(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException ex) {
            log.warn("Product cache write failed, continuing without cache: {}", ex.getMessage());
        }
    }
}

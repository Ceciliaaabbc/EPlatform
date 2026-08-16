package com.ecommerce.order;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The "after-sales" (returns / refund requests) feature does not exist in
 * this backend yet — there is no AfterSaleRequest entity, table, or
 * repository, even though the frontend (AdminOrdersPage, OrderDetailPage)
 * already calls /api/after-sales/* endpoints expecting it to be real.
 *
 * That missing endpoint is what was breaking the Admin Orders page: it has
 * no permitAll rule and no controller, so calling it (even as an
 * authenticated admin) errored out, and the frontend's global 401/403
 * handler forced a logout back to /login.
 *
 * This stub only covers the one call the Admin Orders page makes on load
 * (the list of pending after-sale requests) so that page stops erroring.
 * It always returns an empty list — there is nowhere to store real
 * after-sale requests yet. Customer-facing submission
 * (POST /api/after-sales/orders/{id}) and admin review
 * (PUT /api/after-sales/{id}/review) are still unimplemented.
 */
@RestController
@RequestMapping("/api/after-sales")
public class AfterSalesController {

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Object> getAdminAfterSalesRequests() {
        return List.of();
    }
}

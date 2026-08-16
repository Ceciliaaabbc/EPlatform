package com.ecommerce.product;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository categoryRepository;

    public CategoryController(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public List<Category> getCategories(@RequestParam(defaultValue = "true") boolean activeOnly) {
        return activeOnly
                ? categoryRepository.findByActiveTrueOrderBySortOrderAscNameAsc()
                : categoryRepository.findAllByOrderBySortOrderAscNameAsc();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Category createCategory(@RequestBody Category category) {
        if (category.getName() == null || category.getName().isBlank()) {
            throw new RuntimeException("Category name is required");
        }

        Category newCategory = new Category();
        newCategory.setName(category.getName().trim());
        newCategory.setParentId(category.getParentId());
        newCategory.setSortOrder(category.getSortOrder() == null ? 0 : category.getSortOrder());
        newCategory.setActive(category.getActive() == null ? Boolean.TRUE : category.getActive());

        return categoryRepository.save(newCategory);
    }

    @PutMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('ADMIN')")
    public Category updateCategory(@PathVariable Long id, @RequestBody Category updated) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        if (updated.getName() != null && !updated.getName().isBlank()) {
            category.setName(updated.getName().trim());
        }
        category.setParentId(updated.getParentId());
        category.setSortOrder(updated.getSortOrder() == null ? 0 : updated.getSortOrder());
        category.setActive(updated.getActive() == null ? Boolean.TRUE : updated.getActive());

        return categoryRepository.save(category);
    }

    @DeleteMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('ADMIN')")
    public String deleteCategory(@PathVariable Long id) {
        categoryRepository.deleteById(id);
        return "Category deleted";
    }
}

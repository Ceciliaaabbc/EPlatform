package com.ecommerce.support;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterAll;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
public abstract class PostgresIntegrationTest {

    static PostgreSQLContainer<?> postgres;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        String externalUrl = System.getenv("ECOMMERCE_TEST_DB_URL");
        if (externalUrl != null && !externalUrl.isBlank()) {
            registry.add("spring.datasource.url", () -> externalUrl);
            registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("ECOMMERCE_TEST_DB_USERNAME", "test"));
            registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("ECOMMERCE_TEST_DB_PASSWORD", "test"));
        } else {
            postgres = new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("ecommerce_test")
                    .withUsername("test")
                    .withPassword("test");
            postgres.start();
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        }
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.data.redis.url", () -> "redis://localhost:6379");
        registry.add("jwt.secret", () -> "test-secret-key-test-secret-key-test-secret-key-123456");
        registry.add("stripe.secret-key", () -> "sk_test_dummy");
        registry.add("stripe.webhook-secret", () -> "whsec_test_dummy");
        registry.add("frontend.url", () -> "http://localhost:5173");
        registry.add("aws.region", () -> "us-east-1");
        registry.add("aws.s3.bucket", () -> "test-bucket");
        registry.add("spring.task.scheduling.enabled", () -> "false");
    }

    @AfterAll
    static void stopPostgres() {
        if (postgres != null) {
            postgres.stop();
        }
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.execute("""
                TRUNCATE TABLE
                    cart_items,
                    order_items,
                    orders,
                    reviews,
                    addresses,
                    product_images,
                    product_variants,
                    products,
                    users
                RESTART IDENTITY CASCADE
                """);
    }
}

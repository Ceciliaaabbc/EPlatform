# Stage 1: build the jar with the full Maven+JDK image (not needed at runtime).
FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY . .

RUN mvn clean package -DskipTests

# Stage 2: run on a slim JRE-only image. This alone drops the runtime image
# from ~600MB+ (Maven+full JDK) down to ~200MB, which matters a lot on
# Render's free 512MB instances.
FROM eclipse-temurin:17-jre

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/target/ecommerce-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

# Cap the JVM heap well below the 512MB container limit. Without this, the
# JVM's default heap sizing plus metaspace/thread/native-memory overhead can
# creep past the container's memory limit and get OOM-killed by the host —
# which matches the repeated "Ran out of memory (used over 512MB)" crashes
# seen on Render. This does not raise the ceiling (the container is still
# 512MB total) — it just keeps the JVM inside it more reliably.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=65.0 -XX:+UseSerialGC -Xss512k -XX:MaxMetaspaceSize=128m"

CMD sh -c "java $JAVA_OPTS -jar app.jar"

# Stage 1: Build stage
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /build

# Copy only pom.xml to cache maven dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build the JAR package
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy built JAR from builder stage
COPY --from=builder /build/target/*.jar app.jar

# Expose port 8080
EXPOSE 8080

# Environment variable for JVM options (can be overridden in docker-compose)
ENV JAVA_OPTS="-Xmx512m -Xms256m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

# BƯỚC BUILD: Dùng Maven để tải thư viện và đóng gói code
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY movie-theater-be/pom.xml .
RUN mvn dependency:go-offline
COPY movie-theater-be/src ./src
RUN mvn clean package -DskipTests

# BƯỚC CHẠY: Lấy file .jar vừa build ra để chạy (giúp app siêu nhẹ)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Xmx180m", "-Xss512k", "-jar", "app.jar"]

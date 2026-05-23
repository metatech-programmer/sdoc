FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S sdoc && adduser -S sdoc -G sdoc
USER sdoc
WORKDIR /app
COPY build/libs/*.jar app.jar
EXPOSE 8085
ENTRYPOINT ["java", "-XX:+UseVirtualThreads", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

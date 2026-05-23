FROM eclipse-temurin:21-jre-alpine AS runtime

RUN addgroup -S sdoc && adduser -S sdoc -G sdoc
USER sdoc

WORKDIR /app
COPY build/libs/*.jar app.jar

EXPOSE 8761

ENTRYPOINT ["java", \
  "-XX:+UseVirtualThreads", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]

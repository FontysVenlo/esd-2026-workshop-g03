# syntax=docker/dockerfile:1
# Orbitask PRESENTER image – same app as the student image, plus the reference solutions:
#   - all 7 manager requests in the chat (switch between them)
#   - the reference solution next to each request (request panel in the editor + "Solutions" page)
#   - a draw.io file with a green TO-BE page right after every as-is process
#
# The app code comes from the student folder (../orbitask-workshop) via a named build context, so there is only one
# copy of the app. The solutions live only here – never in the student folder or image.
#
#   docker compose up -d --build                  (uses docker-compose.yml in this folder)
# or
#   docker build --build-context workshop=../orbitask-workshop -t orbitask-presenter .
#   docker run -d -p 8090:8080 -v orbitask-presenter-data:/data --name orbitask-presenter orbitask-presenter
#   → open http://localhost:8090

ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE}

ARG DRAWIO_VERSION=32.5.5
ARG DRAWIO_WAR=https://github.com/jgraph/drawio/releases/download/v${DRAWIO_VERSION}/draw.war
ADD ${DRAWIO_WAR} /tmp/draw.war
RUN mkdir -p /app/drawio \
 && cd /app/drawio \
 && unzip -q /tmp/draw.war \
 && rm -rf /tmp/draw.war WEB-INF META-INF

COPY --from=workshop app/ /app/
COPY solutions/solutions.json solutions/orbitask_reference_solutions.drawio /app/presenter/

ENV PORT=8080 \
    DATA_DIR=/data \
    DRAWIO_DIR=/app/drawio \
    PRESENTER=1

RUN mkdir -p /data && chown -R node:node /data
VOLUME /data
USER node
WORKDIR /app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "server.js"]

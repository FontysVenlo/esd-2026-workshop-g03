# Orbitask BPMN workshop – one container with a fake company chat + the draw.io editor (works offline).
#
#   docker build -t orbitask-workshop .
#   docker run -d -p 8080:8080 -v orbitask-data:/data --name orbitask orbitask-workshop
#   → open http://localhost:8080
#
# Internet is only needed while building (to download Node.js and draw.io). After that it runs offline.

ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE}

# Official draw.io web app (same release that powers the jgraph/drawio image), pinned for reproducibility.
ARG DRAWIO_VERSION=32.5.5
ARG DRAWIO_WAR=https://github.com/jgraph/drawio/releases/download/v${DRAWIO_VERSION}/draw.war
ADD ${DRAWIO_WAR} /tmp/draw.war
RUN mkdir -p /app/drawio \
 && cd /app/drawio \
 && unzip -q /tmp/draw.war \
 && rm -rf /tmp/draw.war WEB-INF META-INF

# The workshop app (plain Node.js, no npm packages needed).
COPY app/ /app/

ENV PORT=8080 \
    DATA_DIR=/data \
    DRAWIO_DIR=/app/drawio
# PROBLEM=1..7 forces a specific problem instead of a random one (optional), e.g. docker run -e PROBLEM=3 ...

RUN mkdir -p /data && chown -R node:node /data
VOLUME /data
USER node
WORKDIR /app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "server.js"]

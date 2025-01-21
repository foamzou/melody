# stage: build frontend
FROM surnet/alpine-node-opencv:16.13.0-4.5.1 AS FRONTEND_BUILD

WORKDIR /app
RUN apk add --no-cache git && \
    npm install -g pnpm@7.8.0

ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY frontend frontend/
WORKDIR /app/frontend
RUN pnpm install --verbose && \
    pnpm run build

# stage: build backend
FROM surnet/alpine-node-opencv:16.13.0-4.5.1 AS BACKEND_BUILD

WORKDIR /app
RUN apk add --no-cache git && \
    npm install -g pnpm@7.8.0

ENV CROSS_COMPILING=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY backend backend/
COPY scripts scripts/
COPY package.json ./

WORKDIR /app/backend
RUN pnpm install --production --verbose

# Download media-get
RUN mkdir -p /app/backend/bin && \
    node /app/scripts/setup-for-build-docker.js

# stage: final
FROM iamccc/alpine-node:16.20

WORKDIR /app

# Install FFmpeg
COPY --from=pldin601/static-ffmpeg:22.04.061404-87ac0d7 /ffmpeg /ffprobe /usr/local/bin/
RUN chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe

ENV PATH="/usr/local/bin:${PATH}"
ENV NODE_ENV=production

# Copy backend with media-get
COPY --from=BACKEND_BUILD /app/backend ./backend
COPY --from=FRONTEND_BUILD /app/frontend/dist ./backend/public

# Ensure media-get is executable
RUN chmod +x /app/backend/bin/media-get

EXPOSE 5566

CMD ["node", "backend/src/index.js"]
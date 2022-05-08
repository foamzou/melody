# stage: build code
FROM mhart/alpine-node:16 AS NODE_IMAGE
WORKDIR /app
COPY . .

RUN export MELODY_IN_DOCKER=1 && npm install pnpm -g && pnpm run init && rm -rf frontend

# stage: copy
FROM mhart/alpine-node:slim-16
WORKDIR /app

COPY --from=mwader/static-ffmpeg:5.0-1 /ffmpeg /ffprobe /usr/local/bin/

COPY --from=NODE_IMAGE /app/ .

EXPOSE 5566

CMD ["node", "backend/src/index.js"]
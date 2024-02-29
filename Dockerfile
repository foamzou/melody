# stage: build code
FROM surnet/alpine-node-opencv:16.13.0-4.5.1 AS NODE_IMAGE
# FROM iamccc/alpine-node:16.20 AS NODE_IMAGE
WORKDIR /app
COPY . .

RUN export MELODY_IN_DOCKER=1 && npm run init && rm -rf frontend

# stage: copy
FROM iamccc/alpine-node:16.20
WORKDIR /app

COPY --from=pldin601/static-ffmpeg:22.04.061404-87ac0d7 /ffmpeg /ffprobe /usr/local/bin/

COPY --from=NODE_IMAGE /app/ .

EXPOSE 5566

CMD ["node", "backend/src/index.js"]
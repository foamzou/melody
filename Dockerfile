# stage: build code
FROM bsingh1904/alpine-node:latest AS NODE_IMAGE
WORKDIR /app
COPY . .

RUN export MELODY_IN_DOCKER=1 && npm run init && rm -rf frontend

# stage: copy
FROM iamccc/alpine-node:14.19
WORKDIR /app

COPY --from=pldin601/static-ffmpeg:22.04.061404-87ac0d7 /ffmpeg /ffprobe /usr/local/bin/

COPY --from=NODE_IMAGE /app/ .

EXPOSE 5566

CMD ["node", "backend/src/index.js"]
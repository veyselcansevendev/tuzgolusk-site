FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && mkdir -p /data /backups && chown node:node /data /backups
USER node
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["sh","-c","npm run db:migrate && npm run db:seed && exec ./node_modules/.bin/next start -H 0.0.0.0"]

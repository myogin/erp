FROM node:24-alpine AS base
RUN apk add --no-cache tzdata
ENV TZ=Asia/Makassar NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# Applied at startup by src/instrumentation.ts.
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

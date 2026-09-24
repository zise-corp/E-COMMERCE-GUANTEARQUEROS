FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=optional

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Solo valores públicos: las credenciales de servidor se entregan al arrancar.
ARG NEXT_PUBLIC_SITE_URL=https://guantearqueros.com
ARG NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/guantearqueros
ARG NEXT_PUBLIC_SUPPORT_EMAIL=ventas@guantearqueros.com
ARG NEXT_PUBLIC_SUPPORT_WHATSAPP=59161235265
ARG NEXT_PUBLIC_DREI_WHATSAPP=59162507981
ARG NEXT_PUBLIC_SUPPORT_URL=https://zise.lat
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=$NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT \
    NEXT_PUBLIC_SUPPORT_EMAIL=$NEXT_PUBLIC_SUPPORT_EMAIL \
    NEXT_PUBLIC_SUPPORT_WHATSAPP=$NEXT_PUBLIC_SUPPORT_WHATSAPP \
    NEXT_PUBLIC_DREI_WHATSAPP=$NEXT_PUBLIC_DREI_WHATSAPP \
    NEXT_PUBLIC_SUPPORT_URL=$NEXT_PUBLIC_SUPPORT_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# La ruta /opengraph-image lee esta fuente desde process.cwd() en runtime.
COPY --from=builder --chown=nextjs:nodejs /app/src/app/fonts ./src/app/fonts

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

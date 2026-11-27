# QUILLART: Astro (Node standalone) image for Dokploy.
# Dependencies are installed and the app is built with Bun; it runs on Node.
# Server secrets (GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, TYPESAFE_API_KEY...)
# are read at runtime with astro:env getSecret(): set them as runtime
# environment variables in Dokploy, never as build args.

FROM node:24-slim AS base
WORKDIR /app
COPY --from=oven/bun:1.4 /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./

FROM base AS prod-deps
RUN bun install --frozen-lockfile --production

FROM base AS build
RUN bun install --frozen-lockfile
COPY . .
# Public values are inlined into the browser bundle at build time.
ARG PUBLIC_SUPABASE_URL=""
ARG PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL \
	PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PUBLIC_SUPABASE_PUBLISHABLE_KEY
RUN bun run build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "./dist/server/entry.mjs"]

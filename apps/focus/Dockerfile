FROM node:23.5.0 AS build
WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/focus/package.json apps/focus/
RUN npm ci --workspace focus --include-workspace-root

COPY apps/focus apps/focus

RUN npm run build --workspace focus
RUN npm prune --omit=dev --workspaces --include-workspace-root

FROM node:23.5.0-slim AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/apps/focus/package.json ./apps/focus/package.json
COPY --from=build /usr/src/app/apps/focus/dist ./apps/focus/dist

WORKDIR /usr/src/app/apps/focus
CMD ["node", "dist/main"]

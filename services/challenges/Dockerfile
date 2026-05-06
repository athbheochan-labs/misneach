FROM node:23.5.0 AS build
WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY services/challenges/package.json services/challenges/
RUN npm ci --workspace challenges --include-workspace-root

COPY services/challenges services/challenges

RUN npm run build --workspace challenges
RUN npm prune --omit=dev --workspaces --include-workspace-root

FROM node:23.5.0-slim AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/services/challenges/package.json ./services/challenges/package.json
COPY --from=build /usr/src/app/services/challenges/dist ./services/challenges/dist

WORKDIR /usr/src/app/services/challenges
CMD ["node", "dist/main"]

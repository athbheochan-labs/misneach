FROM node:23.5.0 AS build
WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY services/courses/package.json services/courses/
RUN npm ci --workspace courses --include-workspace-root

COPY services/courses services/courses

RUN npm run build --workspace courses
RUN npm prune --omit=dev --workspaces --include-workspace-root

FROM node:23.5.0-slim AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/services/courses/package.json ./services/courses/package.json
COPY --from=build /usr/src/app/services/courses/dist ./services/courses/dist
COPY --from=build /usr/src/app/services/courses/entrypoint.sh ./services/courses/entrypoint.sh

WORKDIR /usr/src/app/services/courses
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]

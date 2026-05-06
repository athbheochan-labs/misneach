FROM node:23.5.0 AS build
WORKDIR /usr/src/app/services/waitlist

COPY services/waitlist/package*.json ./
RUN npm install
COPY services/waitlist ./
RUN npm run build

FROM node:23.5.0-slim AS runtime
WORKDIR /usr/src/app/services/waitlist
ENV NODE_ENV=production

COPY --from=build /usr/src/app/services/waitlist/package*.json ./
COPY --from=build /usr/src/app/services/waitlist/node_modules ./node_modules
COPY --from=build /usr/src/app/services/waitlist/dist ./dist

EXPOSE 3021
CMD ["node", "dist/main"]

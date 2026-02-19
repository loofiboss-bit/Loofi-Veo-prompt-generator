FROM node:lts-alpine AS base
WORKDIR /usr/src/app

FROM base AS deps
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm ci --silent --ignore-scripts

FROM deps AS builder
COPY . .
RUN npm run build

FROM deps AS development
COPY . .
ENV NODE_ENV=development
EXPOSE 8080
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]

FROM node:lts-alpine AS production
WORKDIR /usr/src/app
RUN chown -R node:node /usr/src/app
USER node
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --from=builder --chown=node:node /usr/src/app/scripts/serve-dist.mjs ./scripts/serve-dist.mjs
EXPOSE 8080
CMD ["node", "./scripts/serve-dist.mjs"]

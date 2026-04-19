FROM node:22.21.0-alpine3.22 AS development

RUN apk add --no-cache tini

WORKDIR /usr/src/app

COPY --chown=node:node package.json ./
COPY --chown=node:node package-lock.json ./
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node tsconfig.build.json ./
COPY --chown=node:node nest-cli.json ./
COPY --chown=node:node apps/gateway/package.json apps/gateway/package.json

RUN npm ci

COPY --chown=node:node apps/gateway apps/gateway
COPY --chown=node:node libs libs
COPY --chown=node:node scripts scripts

RUN npx nest build gateway

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/apps/gateway/main"]


FROM node:22.21.0-alpine3.22 AS production

RUN apk add --no-cache tini

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --chown=node:node package.json ./
COPY --chown=node:node package-lock.json ./
COPY --chown=node:node apps/gateway/package.json apps/gateway/package.json

RUN npm ci --omit=dev

COPY --from=development --chown=node:node /usr/src/app/dist ./dist
COPY --from=development --chown=node:node /usr/src/app/scripts ./scripts

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/apps/gateway/main"]

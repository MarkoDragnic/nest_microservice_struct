FROM node:22.21.0-alpine3.22 AS development

RUN apk add --no-cache tini

WORKDIR /usr/src/app

# Copy package files first — layer cached until deps change
COPY --chown=node:node package.json ./
COPY --chown=node:node package-lock.json ./
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node tsconfig.build.json ./
COPY --chown=node:node nest-cli.json ./
COPY --chown=node:node apps/accounts/package.json apps/accounts/package.json

RUN npm ci

# Copy source after install so code changes don't bust the install cache
COPY --chown=node:node apps/accounts apps/accounts
COPY --chown=node:node libs libs
COPY --chown=node:node scripts scripts

RUN npx nest build accounts

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/apps/accounts/main"]


FROM node:22.21.0-alpine3.22 AS production

RUN apk add --no-cache tini

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy only the package files needed for this service
COPY --chown=node:node package.json ./
COPY --chown=node:node package-lock.json ./
COPY --chown=node:node apps/accounts/package.json apps/accounts/package.json

# Install prod deps only — dev tools (nest cli, ts, jest) are excluded
RUN npm ci --omit=dev

# Pull the compiled bundle from the builder stage
COPY --from=development --chown=node:node /usr/src/app/dist ./dist
COPY --from=development --chown=node:node /usr/src/app/scripts ./scripts

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/apps/accounts/main"]

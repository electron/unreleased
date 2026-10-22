# Node 22 + Yarn 4 service for ionic, based on electron/ionic-kit's
# templates/Dockerfile.node. Plain JavaScript with no build step, so there is
# a single stage that installs production deps and copies the runtime files.
FROM node:22-alpine
WORKDIR /app
# tini: see ENTRYPOINT.
RUN apk add --no-cache tini \
 && corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
# Production deps only; `focus` also works on a single-workspace repo.
RUN yarn workspaces focus --all --production \
 && yarn cache clean
# action-audit.js is only used by the GitHub Actions audit workflows.
COPY server.js constants.js ./
COPY utils/ ./utils/

# The cluster runs pods as uid/gid 1000 with a read-only root filesystem and a
# writable emptyDir at /tmp. HOME=/tmp keeps anything that writes to $HOME at
# runtime (git config, npm, corepack) off the read-only layers.
USER 1000:1000
ENV NODE_ENV=production \
    PORT=8080 \
    HOME=/tmp
EXPOSE 8080
# No HEALTHCHECK: Kubernetes probes /healthz instead.
# tini runs as PID 1 and forwards SIGTERM to the app, which has no SIGTERM
# handler of its own; without it the kernel ignores the signal and every pod
# waits out the 30s grace period before being SIGKILLed.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]

FROM node:12.16.1-alpine3.11
EXPOSE 5488

RUN addgroup -S jsreport && adduser --shell /bin/bash -S -G jsreport jsreport

RUN apk update --no-cache && apk upgrade --no-cache  && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
  apk add --no-cache \
    libstdc++@edge \
    chromium@edge=79.0.3945.130-r0 \
    nss@edge \
    freetype@edge \
    harfbuzz@edge \
    ttf-freefont@edge \
    # just for now as we npm install from git
    git \
    # so user can docker exec -it test /bin/bash
    bash \
  && rm -rf /var/cache/apk/* /tmp/*

RUN mkdir -p /app
RUN chown -R jsreport:jsreport /app
RUN rm -rf /tmp/*

# we need to create the volume and give it expected owner
# before the VOLUME step in order for the volume to be created with non-root user
RUN mkdir /jsreport
RUN chown jsreport:jsreport /jsreport
RUN chmod g+s /jsreport

VOLUME ["/jsreport"]

USER jsreport:jsreport

ENV NPM_CONFIG_PREFIX /home/jsreport/.npm-global
ENV PATH $PATH:/home/jsreport/.npm-global/bin

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

RUN npm install -g jsreport-cli

RUN jsreport init 2.7.1

COPY --chown=jsreport:jsreport editConfig.js /app/editConfig.js
RUN node editConfig.js

RUN npm uninstall -g jsreport-cli && \
    npm cache clean -f && rm -rf /tmp/*

COPY --chown=jsreport:jsreport run.sh /app/run.sh
COPY --chown=jsreport:jsreport . /app

ENV NODE_ENV production
ENV chrome:launchOptions:executablePath /usr/lib/chromium/chrome
ENV chrome_launchOptions_args --no-sandbox,--disable-dev-shm-usage

CMD ["bash", "/app/run.sh"]

FROM node:alpine
EXPOSE 5488

RUN addgroup -S jsreport && adduser -S -G jsreport jsreport

RUN apk update --no-cache && apk upgrade --no-cache  && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
  apk add --no-cache \
    chromium@edge=73.0.3683.103-r0 \
    nss@edge \
    freetype@edge \
    harfbuzz@edge \
    ttf-freefont@edge \
    # just for now as we npm install from git
    git \
    # so user can docker exec -it test /bin/bash
    bash \
  && rm -rf /var/cache/apk/* /tmp/*

VOLUME ["/jsreport"]
RUN mkdir -p /app
WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

RUN npm install -g jsreport-cli && \
    jsreport init && \
    npm uninstall -g jsreport-cli && \
    npm cache clean -f

COPY editConfig.js /app/editConfig.js
RUN node editConfig.js

ADD run.sh /app/run.sh
COPY . /app

ENV NODE_ENV production
ENV chrome:launchOptions:executablePath /usr/lib/chromium/chrome
ENV chrome:launchOptions:args --no-sandbox
ENV templatingEngines:strategy http-server

CMD ["bash", "/app/run.sh"]

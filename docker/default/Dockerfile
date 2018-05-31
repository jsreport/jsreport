FROM node:alpine
EXPOSE 5488

RUN addgroup -S jsreport && adduser -S -G jsreport jsreport 

RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories \
  && apk update --no-cache \
  && apk add --no-cache \
    chromium>64.0.3282.168-r0 \
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

FROM jsreport/jsreport:4.14.1
EXPOSE 5488
ARG TARGETPLATFORM
ARG UID=2500
ARG GID=2500

USER root

RUN apk update --no-cache && \
    echo @edge http://dl-cdn.alpinelinux.org/alpine/v3.21/community >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
    apk add --no-cache \
    harfbuzz@edge \
    harfbuzz-subset@edge

RUN rm -rf /var/cache/apk/* /tmp/*

RUN npm install jsreport@4.14.2
RUN npm cache clean -f && rm -rf /tmp/*

COPY ./packages/jsreport/docker/default/editConfig.js editConfig.js
COPY ./packages/jsreport/docker/default/run.sh run.sh
RUN node editConfig.js

RUN chown -R jsreport:jsreport /app
USER jsreport:jsreport

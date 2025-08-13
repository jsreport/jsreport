FROM jsreport/jsreport:4.10.0
EXPOSE 5488
ARG TARGETPLATFORM
ARG UID=2500
ARG GID=2500

RUN npm install jsreport@4.10.1
RUN npm cache clean -f && rm -rf /tmp/*

COPY ./packages/jsreport/docker/default/editConfig.js editConfig.js
COPY ./packages/jsreport/docker/default/run.sh run.sh
RUN node editConfig.js

RUN chown -R jsreport:jsreport /app

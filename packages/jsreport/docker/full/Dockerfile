FROM jsreport/jsreport:4.10.0-full
EXPOSE 5488
ARG TARGETPLATFORM
ARG UID=2500
ARG GID=2500

USER root
RUN npm install jsreport@4.10.1
RUN npm cache clean -f && rm -rf /tmp/*

COPY ./packages/jsreport/docker/full/install-or-build-oracledb-for-store.js install-or-build-oracledb-for-store.js
COPY ./packages/jsreport/docker/full/build-oracledb-src.sh build-oracledb-src.sh
# script created with steps recommend here from oracledb repository
# https://github.com/oracle/node-oracledb/issues/1382#issuecomment-849157748
RUN node install-or-build-oracledb-for-store.js --target=$TARGETPLATFORM --storeVersion=4.1.0
COPY ./packages/jsreport/docker/default/editConfig.js editConfig.js
COPY ./packages/jsreport/docker/full/run.sh run.sh
RUN node editConfig.js

RUN chown -R jsreport:jsreport /app
USER jsreport:jsreport

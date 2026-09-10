FROM jsreport/jsreport:4.14.1-full
EXPOSE 5488
ARG TARGETPLATFORM
ARG UID=2500
ARG GID=2500

USER root
RUN npm install jsreport@4.14.2

RUN npm install --save --save-exact @jsreport/jsreport-ejs@4.1.0 \
    @jsreport/jsreport-pug@5.1.0 \
    @jsreport/jsreport-aws-s3-storage@4.2.0 \
    @jsreport/jsreport-azure-storage@4.2.0 \
    @jsreport/jsreport-docxtemplater@4.2.3 \
    @jsreport/jsreport-mssql-store@4.2.3 \
    @jsreport/jsreport-postgres-store@4.3.3 \
    @jsreport/jsreport-mongodb-store@4.2.0 \
    @jsreport/jsreport-office-password@4.2.0 \
    @jsreport/jsreport-html-to-text@4.3.0 \
    @jsreport/jsreport-html-embedded-in-docx@4.2.3 \
    @jsreport/jsreport-fs-store-aws-s3-persistence@4.2.2 \
    @jsreport/jsreport-fs-store-azure-storage-persistence@4.2.0 \
    @jsreport/jsreport-unoconv@4.2.1 \
    @jsreport/jsreport-libreoffice@1.1.0 \
    cheerio-page-eval@1.4.0

COPY ./packages/jsreport/docker/full/install-or-build-oracledb-for-store.js install-or-build-oracledb-for-store.js
COPY ./packages/jsreport/docker/full/build-oracledb-src.sh build-oracledb-src.sh
# script created with steps recommend here from oracledb repository
# https://github.com/oracle/node-oracledb/issues/1382#issuecomment-849157748
RUN node install-or-build-oracledb-for-store.js --target=$TARGETPLATFORM --storeVersion=4.2.3

RUN npm cache clean -f && rm -rf /tmp/*

COPY ./packages/jsreport/docker/default/editConfig.js editConfig.js
COPY ./packages/jsreport/docker/full/run.sh run.sh
RUN node editConfig.js

RUN chown -R jsreport:jsreport /app
USER jsreport:jsreport

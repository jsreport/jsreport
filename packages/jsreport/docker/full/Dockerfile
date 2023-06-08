FROM jsreport/jsreport:3.11.3-full
ARG TARGETPLATFORM

RUN npm install --save --save-exact jsreport@3.12.0 \
    @jsreport/jsreport-ejs@3.0.1 \
    @jsreport/jsreport-pug@4.0.0 \
    @jsreport/jsreport-aws-s3-storage@3.0.0 \
    @jsreport/jsreport-azure-storage@3.0.2 \
    @jsreport/jsreport-docxtemplater@3.2.0 \
    @jsreport/jsreport-mssql-store@3.1.1 \
    @jsreport/jsreport-postgres-store@3.1.1 \
    @jsreport/jsreport-mongodb-store@3.2.0 \
    @jsreport/jsreport-office-password@3.0.1 \
    @jsreport/jsreport-html-to-text@3.0.0 \
    @jsreport/jsreport-html-embedded-in-docx@3.1.0 \
    @jsreport/jsreport-fs-store-aws-s3-persistence@3.1.0 \
    @jsreport/jsreport-fs-store-azure-storage-persistence@3.0.0 \
    @jsreport/jsreport-unoconv@3.0.1 \
    cheerio-page-eval@1.0.0

# we only add these lines because we are using FROM jsreport/jsreport:3.11.3-full
# and we want to ensure that we don't use the deps built from the image
RUN rm -rf /app/node_modules/oracledb
RUN rm -rf /app/node_modules/@jsreport/jsreport-oracle-store

COPY ./packages/jsreport/docker/full/install-or-build-oracledb-for-store.js install-or-build-oracledb-for-store.js
COPY ./packages/jsreport/docker/full/build-oracledb-src.sh build-oracledb-src.sh
# script created with steps recommend here from oracledb repository
# https://github.com/oracle/node-oracledb/issues/1382#issuecomment-849157748
RUN node install-or-build-oracledb-for-store.js --target=$TARGETPLATFORM --storeVersion=3.3.2

RUN npm cache clean -f && rm -rf /tmp/*

COPY ./packages/jsreport/docker/default/editConfig.js editConfig.js
COPY ./packages/jsreport/docker/full/run.sh run.sh
RUN node editConfig.js

RUN chown -R jsreport:jsreport /app

ENV chrome_launchOptions_args --no-sandbox,--disable-dev-shm-usage

CMD ["bash", "run.sh"]


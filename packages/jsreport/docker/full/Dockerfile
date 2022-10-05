FROM ubuntu:focal
EXPOSE 5488
USER root
ARG TARGETPLATFORM

RUN set -eux; \
    apt-get update; \
    apt-get install -y gosu; \
    rm -rf /var/lib/apt/lists/*; \
    # verify that the binary works
    gosu nobody true

RUN adduser --disabled-password --gecos "" jsreport

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends software-properties-common wget gnupg git curl make build-essential && \
    apt update && apt install -y gconf-service libgbm-dev libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libappindicator3-1 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils && \
    # adding custom ppa repository to get access to custom version of chromium for macOS M1 hardware
    add-apt-repository ppa:phd/chromium-browser && \
    apt-get update && \
    apt install -y chromium-browser=105.0.5195.102-0ubuntu0.18.04.1 chromium-codecs-ffmpeg=105.0.5195.102-0ubuntu0.18.04.1 && \
    # fonts for chrome
    apt install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst && \
    # unoconv
    apt-get -y install unoconv

# cleanup
RUN rm -rf /var/lib/apt/lists/* /var/cache/apt/* && \
    rm -rf /src/*.deb && \
    rm -rf /var/cache/apk/* /tmp/*

RUN mkdir -p /app

# we need to create the volume and give it expected owner
# before the VOLUME step in order for the volume to be created with non-root user
RUN mkdir /jsreport
RUN chown jsreport:jsreport /jsreport
RUN chmod g+s /jsreport

VOLUME ["/jsreport"]

# node
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app

RUN npm i -g @jsreport/jsreport-cli
RUN jsreport init

RUN npm install --save --save-exact @jsreport/jsreport-ejs@3.0.0 \
    @jsreport/jsreport-pug@4.0.0 \
    @jsreport/jsreport-aws-s3-storage@3.0.0 \
    @jsreport/jsreport-azure-storage@3.0.0 \
    @jsreport/jsreport-docxtemplater@3.1.0 \
    @jsreport/jsreport-mssql-store@3.1.0 \
    @jsreport/jsreport-postgres-store@3.1.0 \
    @jsreport/jsreport-mongodb-store@3.1.1 \
    @jsreport/jsreport-office-password@3.0.1 \
    @jsreport/jsreport-html-to-text@3.0.0 \
    @jsreport/jsreport-html-embedded-in-docx@3.0.0 \
    @jsreport/jsreport-fs-store-aws-s3-persistence@3.0.1 \
    @jsreport/jsreport-fs-store-azure-storage-persistence@3.0.0 \
    @jsreport/jsreport-unoconv@3.0.1 \
    cheerio-page-eval@1.0.0

COPY ./packages/jsreport/docker/full/install-or-build-oracledb-for-store.js install-or-build-oracledb-for-store.js
COPY ./packages/jsreport/docker/full/build-oracledb-src.sh build-oracledb-src.sh
# script created with steps recommend here from oracledb repository
# https://github.com/oracle/node-oracledb/issues/1382#issuecomment-849157748
RUN node install-or-build-oracledb-for-store.js --target=$TARGETPLATFORM --storeVersion=3.1.0

RUN npm cache clean -f && rm -rf /tmp/*

COPY ./packages/jsreport/docker/default/editConfig.js editConfig.js
COPY ./packages/jsreport/docker/full/run.sh run.sh
RUN node editConfig.js

RUN chown -R jsreport:jsreport /app

ENV chrome_launchOptions_args --no-sandbox,--disable-dev-shm-usage

CMD ["bash", "run.sh"]


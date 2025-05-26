FROM ubuntu:noble
EXPOSE 5488
USER root
ARG TARGETPLATFORM
ARG UID=2500
ARG GID=2500

RUN set -eux; \
    apt-get update; \
    apt-get install -y gosu adduser; \
    rm -rf /var/lib/apt/lists/*; \
    # verify that the binary works
    gosu nobody true

RUN groupadd -g "${GID}" jsreport && adduser --disabled-password --uid "${UID}" --gid "${GID}" --gecos "" jsreport

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends apt-transport-https apt-utils build-essential software-properties-common wget gnupg bzip2 git curl && \
    apt update && apt install -y libgbm-dev libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libappindicator3-1 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libnss3 lsb-release xdg-utils && \
    # adding custom ppa repository to get access to custom version of chromium for macOS Apple Silicon hardware
    # this ppa has builds available for architectures amd64, arm64 (which we care because we produce arm64 builds)
    # the default puppeteer download does not work for arm, because there is no arm version for chromium
    # https://github.com/puppeteer/puppeteer/issues/7740
    add-apt-repository ppa:xtradeb/apps && \
    apt-get update && \
    apt install -y chromium=136.0.7103.113-1xtradeb1.2404.1 && \
    # fonts for chrome
    apt install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst && \
    # unoconv
    apt-get -y install unoconv && \
    # libreoffice
    apt-get -y install default-jre libreoffice-java-common

# cleanup
RUN rm -rf /var/lib/apt/lists/* /var/cache/apt/* && \
    rm -rf /src/*.deb && \
    rm -rf /var/cache/apk/* /tmp/*

RUN mkdir -p /app/.puppeteer-cache

# we need to create the volume and give it expected owner
# before the VOLUME step in order for the volume to be created with non-root user
RUN mkdir /jsreport
RUN chown jsreport:jsreport /jsreport
RUN chmod g+s /jsreport

VOLUME ["/jsreport"]

# node
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app
ENV PUPPETEER_CACHE_DIR=/app/.puppeteer-cache

# ====== COMMENT THIS WHEN CHECKING trivy audit ======
RUN npm i -g @jsreport/jsreport-cli
RUN jsreport init
# =====================================================

# ====== UNCOMMENT THIS WHEN CHECKING trivy audit ======
# trivy checks should be done with this image default/Dockerfile,
# because it does not add the whole yarn workspace
# (which makes it report vulnerabilities for other packages in the workspace that are not relevant here)
# (we need to build with latest package.json in workspace)
# COPY ./packages/jsreport/server.js server.js
# COPY ./packages/jsreport/index.js index.js
# COPY ./packages/jsreport/package.json package.json
# COPY ./packages/jsreport/docker/default/jsreport.config.json jsreport.config.json
# RUN npm install
# =====================================================

RUN npm install --save --save-exact @jsreport/jsreport-ejs@4.0.1 \
    @jsreport/jsreport-pug@5.0.1 \
    @jsreport/jsreport-aws-s3-storage@4.0.1 \
    @jsreport/jsreport-azure-storage@4.1.0 \
    @jsreport/jsreport-docxtemplater@4.1.4 \
    @jsreport/jsreport-mssql-store@4.1.0 \
    @jsreport/jsreport-postgres-store@4.1.0 \
    @jsreport/jsreport-mongodb-store@4.1.0 \
    @jsreport/jsreport-office-password@4.1.0 \
    @jsreport/jsreport-html-to-text@4.2.0 \
    @jsreport/jsreport-html-embedded-in-docx@4.1.4 \
    @jsreport/jsreport-fs-store-aws-s3-persistence@4.0.2 \
    @jsreport/jsreport-fs-store-azure-storage-persistence@4.1.0 \
    @jsreport/jsreport-unoconv@4.1.0 \
    @jsreport/jsreport-libreoffice@1.0.0 \
    cheerio-page-eval@1.2.1

COPY ./packages/jsreport/docker/full/install-or-build-oracledb-for-store.js install-or-build-oracledb-for-store.js
COPY ./packages/jsreport/docker/full/build-oracledb-src.sh build-oracledb-src.sh
# script created with steps recommend here from oracledb repository
# https://github.com/oracle/node-oracledb/issues/1382#issuecomment-849157748
RUN node install-or-build-oracledb-for-store.js --target=$TARGETPLATFORM --storeVersion=4.1.0

RUN npm cache clean -f && rm -rf /tmp/*

COPY ./packages/jsreport/docker/default/editConfig.js editConfig.js
COPY ./packages/jsreport/docker/full/run.sh run.sh
RUN node editConfig.js

RUN chown -R jsreport:jsreport /app
USER jsreport:jsreport

ENV chrome_launchOptions_args=--no-sandbox,--disable-dev-shm-usage

CMD ["bash", "run.sh"]

FROM ubuntu:focal
EXPOSE 5488
USER root

RUN set -eux; \
    apt-get update; \
    apt-get install -y gosu; \
    rm -rf /var/lib/apt/lists/*; \
    # verify that the binary works
    gosu nobody true

RUN adduser --disabled-password --gecos "" jsreport

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends wget gnupg git curl ca-certificates && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    # install latest chrome just to get package deps installed
    apt-get install -y lsb-release libappindicator3-1 google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst --no-install-recommends && \
    # then replace that chrome with specific chrome version, see https://github.com/webnicer/chrome-downloads for available versions
    wget https://github.com/webnicer/chrome-downloads/raw/master/x64.deb/google-chrome-stable_91.0.4472.101-1_amd64.deb && \
    dpkg -i ./google-chrome*.deb && \
    rm google-chrome*.deb && \
    # unoconv
    apt-get -y install unoconv && \
    # cleanup
    rm -rf /var/lib/apt/lists/* /var/cache/apt/* && \
    rm -rf /src/*.deb

RUN rm -rf /var/cache/apk/* /tmp/*

RUN mkdir -p /app

# we need to create the volume and give it expected owner
# before the VOLUME step in order for the volume to be created with non-root user
RUN mkdir /jsreport
RUN chown jsreport:jsreport /jsreport
RUN chmod g+s /jsreport

VOLUME ["/jsreport"]

RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

RUN npm i -g @jsreport/jsreport-cli
RUN jsreport init

RUN npm install --save --save-exact @jsreport/jsreport-ejs@3.0.0-beta.1 \
    @jsreport/jsreport-pug@4.0.0-beta.1 \
    @jsreport/jsreport-azure-storage@3.0.0-beta.1 \
    @jsreport/jsreport-mssql-store@3.0.0-beta.1 \
    @jsreport/jsreport-postgres-store@3.0.0-beta.1 \
    @jsreport/jsreport-mongodb-store@3.0.0-beta.1 \
    @jsreport/jsreport-html-to-text@3.0.0-beta.1 \
    @jsreport/jsreport-html-embedded-in-docx@3.0.0-beta.1 \
    @jsreport/jsreport-fs-store-aws-s3-persistence@3.0.0-beta.1 \
    @jsreport/jsreport-fs-store-azure-storage-persistence@3.0.0-beta.1 \
    @jsreport/jsreport-electron-pdf@4.0.0-beta.1

RUN npm uninstall -g @jsreport/jsreport-cli && \
    npm cache clean -f && rm -rf /tmp/*

COPY ./packages/jsreport/docker/default/editConfig.js editConfig.js
COPY ./packages/jsreport/docker/default/run.sh run.sh

RUN chown -R jsreport:jsreport /app

ENV chrome_launchOptions_executablePath google-chrome-stable
ENV chrome_launchOptions_args --no-sandbox,--disable-dev-shm-usage

CMD ["bash", "run.sh"]

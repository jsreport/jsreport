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
    wget https://github.com/webnicer/chrome-downloads/raw/master/x64.deb/google-chrome-stable_90.0.4430.93-1_amd64.deb && \
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

RUN npm i -g jsreport-cli
RUN jsreport init

RUN npm install --save --save-exact jsreport-ejs@2.2.0 \
    jsreport-pug@3.1.0 \
    jsreport-azure-storage@1.1.1 \ 
    jsreport-mssql-store@1.4.1 \
    jsreport-postgres-store@1.3.2 \
    jsreport-mongodb-store@1.3.3 \
    jsreport-oracle-store@0.2.0 \   
    jsreport-html-to-text@2.1.0 \  
    jsreport-html-embedded-in-docx@2.2.0 \
    jsreport-fs-store-aws-s3-persistence@1.4.0 \
    jsreport-fs-store-azure-storage-persistence@1.2.2

RUN npm uninstall -g jsreport-cli && \
    npm cache clean -f && rm -rf /tmp/*

COPY docker/default/editConfig.js editConfig.js
COPY docker/default/run.sh run.sh

RUN chown -R jsreport:jsreport /app

ENV chrome_launchOptions_executablePath google-chrome-stable
ENV chrome_launchOptions_args --no-sandbox,--disable-dev-shm-usage

CMD ["bash", "run.sh"]
FROM ubuntu:xenial-20200212
# not using ubuntu:bionic because phantomjs 1.9.8 does not work there
# (it contains a newer version of OpenSSL which can not be used with phantomjs)
EXPOSE 5488

RUN adduser --disabled-password --gecos "" jsreport && \
    apt-get update && \
    apt-get install -y --no-install-recommends libgconf-2-4 gnupg git curl wget ca-certificates && \
    # phantom/electron
    apt-get install -y --no-install-recommends libgtk2.0-dev \
        libxtst-dev \
        libxss1 \
        libgconf2-dev \
        libnss3-dev \
        libasound2-dev \
        xvfb \
        xfonts-75dpi \
        xfonts-base && \
    # java fop
    apt-get install -y default-jre unzip && \
    curl -o fop.zip archive.apache.org/dist/xmlgraphics/fop/binaries/fop-2.1-bin.zip && \
    unzip fop.zip && \
    rm fop.zip && \
    chmod +x fop-2.1/fop && \
    apt-get update && \
    # chrome
    apt-get install -y libgconf-2-4 && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    # install latest chrome just to get package deps installed
    apt-get install -y lsb-release libappindicator3-1 google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst --no-install-recommends && \
    # then replace that chrome with specific chrome version, see https://github.com/webnicer/chrome-downloads for available versions
    wget https://github.com/webnicer/chrome-downloads/raw/master/x64.deb/google-chrome-stable_79.0.3945.130-1_amd64.deb && \
    dpkg -i ./google-chrome*.deb && \
    rm google-chrome*.deb && \
    # phantomjs
    curl -Lo phantomjs.tar.bz2 https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-1.9.8-linux-x86_64.tar.bz2 && \
    tar jxvf phantomjs.tar.bz2 && \
    chmod +x phantomjs-1.9.8-linux-x86_64/bin/phantomjs && \
    mv phantomjs-1.9.8-linux-x86_64/bin/phantomjs /usr/local/bin/ && \
    rm -rf phantomjs* && \
    # cleanup
    rm -rf /var/lib/apt/lists/* /var/cache/apt/* && \
    rm -rf /src/*.deb

RUN mkdir -p /app
RUN chown -R jsreport:jsreport /app
RUN rm -rf /tmp/*

# we need to create the volume and give it expected owner
# before the VOLUME step in order for the volume to be created with non-root user
RUN mkdir /jsreport
RUN chown jsreport:jsreport /jsreport
RUN chmod g+s /jsreport

VOLUME ["/jsreport"]

USER jsreport:jsreport

ENV NVM_DIR /home/jsreport/.nvm
ENV NODE_VERSION 12.16.1

# node
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.2/install.sh | bash && \
    /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

WORKDIR /app

# the chrome was already installed from apt-get
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

RUN npm install -g jsreport-cli

RUN jsreport init 2.11.0

RUN npm install --save --save-exact jsreport-ejs@2.2.0 \
        jsreport-pug@3.1.0 \
        jsreport-azure-storage@1.1.1 \
        jsreport-phantom-pdf@2.6.1 \
        jsreport-phantom-image@2.1.1 \
        jsreport-mssql-store@1.4.1 \
        jsreport-postgres-store@1.3.2 \
        jsreport-mongodb-store@1.3.3 \
        jsreport-wkhtmltopdf@2.3.0 \
        jsreport-html-to-text@2.1.0 \
        jsreport-fop-pdf@2.2.0 \
        jsreport-html-embedded-in-docx@2.2.0 \
        jsreport-fs-store-aws-s3-persistence@1.4.0 \
        jsreport-fs-store-azure-storage-persistence@1.2.2 \
        jsreport-fs-store-azure-sb-sync@1.1.0 \
        jsreport-fs-store-aws-sns-sync@1.2.1 \
        electron@1.8.7 \
        jsreport-electron-pdf@3.2.0 \
        phantomjs-exact-2-1-1@0.1.0 \
        jsreport-debug \
        promise-serial \
        request \
        moment \
        nodemailer \
        inline-css \
        @google/maps \
        aws-smtp-credentials \
        moment-timezone \
        && \    
        npm cache clean -f && \  
        rm -rf /tmp/*

COPY --chown=jsreport:jsreport editConfig.js /app/editConfig.js
RUN node editConfig.js

RUN npm uninstall -g jsreport-cli && npm cache clean -f && rm -rf /tmp/*

COPY --chown=jsreport:jsreport run.sh /app/run.sh
COPY --chown=jsreport:jsreport . /app

ENV PATH "$PATH:/fop-2.1"
ENV NODE_ENV production
ENV chrome_launchOptions_executablePath google-chrome-stable
ENV chrome_launchOptions_args --no-sandbox,--disable-dev-shm-usage

CMD ["bash", "/app/run.sh"]

# using xenial for now to be able to use phantom -> with newer ubuntu phantom cannot download images over https
FROM ubuntu:xenial
EXPOSE 2000

RUN adduser --disabled-password --gecos "" jsreport && \
    apt-get update && \
    apt-get install -y --no-install-recommends libxss1 libgconf-2-4 libappindicator3-1 libxtst6 gnupg bzip2 git curl wget ca-certificates && \
    # chrome needs some base fonts
    apt-get install -y --no-install-recommends xfonts-base xfonts-75dpi && \
    # chrome
    apt-get install -y libgconf-2-4 && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    # install latest chrome just to get package deps installed
    apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst --no-install-recommends && \
    # then replace that chrome with specific chrome version, see https://github.com/webnicer/chrome-downloads for available versions
    wget https://github.com/webnicer/chrome-downloads/raw/master/x64.deb/google-chrome-stable_93.0.4577.82-1_amd64.deb && \
    dpkg -i ./google-chrome*.deb && \
    rm google-chrome*.deb && \
    # fix duplicated chrome source, leave the image in clean state for other images can use
    # apt-get correctly
    rm -f /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    # cleanup
    rm -rf /var/lib/apt/lists/* /var/cache/apt/* && \
    rm -rf /src/*.deb

RUN mkdir -p /app
RUN chown -R jsreport:jsreport /app
RUN rm -rf /tmp/*

USER jsreport:jsreport

ENV NVM_DIR /home/jsreport/.nvm
ENV NODE_VERSION 16.11.1

# node
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.2/install.sh | bash && \
    /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

WORKDIR /app

# the chrome was already installed from apt-get
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

COPY --chown=jsreport:jsreport packages/worker /app
RUN npm install --production
RUN npm cache clean -f && rm -rf /tmp/*

CMD ["node", "server.js"]

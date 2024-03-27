FROM ubuntu:focal
EXPOSE 2000
ARG TARGETPLATFORM

RUN adduser --disabled-password --gecos "" jsreport

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends apt-transport-https apt-utils software-properties-common wget gnupg bzip2 git curl && \    
    apt update && apt install -y gconf-service libgbm-dev libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libappindicator3-1 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils

# adding custom ppa repository to get access to custom version of chromium for macOS Apple Silicon hardware
# this ppa has builds available for architectures amd64, arm64 (which we care because we produce arm64 builds)
# the default puppeteer download does not work for arm, because there is no arm version for chromium
# https://github.com/puppeteer/puppeteer/issues/7740
RUN add-apt-repository ppa:phd/chromium-browser && \
    apt-get update && \
    apt install -y chromium-browser=112.0.5615.49-0ubuntu0.18.04.1 chromium-codecs-ffmpeg=112.0.5615.49-0ubuntu0.18.04.1 && \
    # fonts for chrome
    apt install -y xfonts-base xfonts-75dpi fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst

# cleanup
RUN rm -rf /var/lib/apt/lists/* /var/cache/apt/* && \
    rm -rf /src/*.deb

RUN mkdir -p /app
RUN chown -R jsreport:jsreport /app
RUN rm -rf /tmp/*

USER jsreport:jsreport

ENV NVM_DIR /home/jsreport/.nvm
ENV NODE_VERSION 18.19.1

# node
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.2/install.sh | bash && \
    /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

ENV WORKDIR=/app
WORKDIR $WORKDIR

COPY --chown=jsreport:jsreport packages/worker /app
RUN npm install --production

RUN npm cache clean -f && rm -rf /tmp/*

CMD ["node", "server.js"]

FROM ubuntu:xenial
MAINTAINER Jan Blaha
EXPOSE 5488

RUN adduser --disabled-password --gecos "" jsreport && \
    apt-get update && \
    apt-get install -y --no-install-recommends curl wget ca-certificates && \
    # node
    curl -sL https://deb.nodesource.com/setup_8.x | bash - && \
    #chrome
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    apt-get install -y --no-install-recommends nodejs \
        libgtk2.0-dev \
        libxtst-dev \
        libxss1 \
        libgconf2-dev \
        libnss3-dev \
        libasound2-dev \
        xvfb \
        xfonts-75dpi \
        xfonts-base \            
        # chrome deps
        google-chrome-unstable \
        fonts-ipafont-gothic \ 
        fonts-wqy-zenhei \
        fonts-thai-tlwg \
        fonts-kacst \
        ttf-freefont \
    && \
    rm -rf /tmp/* /var/lib/apt/lists/* /var/cache/apt/* && \
    ## install manually single global phnatomjs
    curl -Lo phantomjs.tar.bz2 https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-1.9.8-linux-x86_64.tar.bz2 && \
    tar jxvf phantomjs.tar.bz2 && \
    chmod +x phantomjs-1.9.8-linux-x86_64/bin/phantomjs && \
    mv phantomjs-1.9.8-linux-x86_64/bin/phantomjs /usr/local/bin/ && \
    rm -rf phantomjs* && \
    apt-get purge --auto-remove -y curl && \
    rm -rf /src/*.deb 

VOLUME ["/jsreport"]

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# the chrome was already installed from apt-get
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true  

RUN npm install --production jsreport && \
    node node_modules/jsreport --init && \
    npm install --production --save --save-exact jsreport-ejs \
        jsreport-jade \
        jsreport-freeze \
        jsreport-phantom-image \
        jsreport-mssql-store \
        jsreport-postgres-store \
        jsreport-mongodb-store \
        jsreport-wkhtmltopdf \
        electron \
        jsreport-electron-pdf \
        jsreport-version-control \
        jsreport-pdf-utils \
        jsreport-chrome-pdf \
        phantomjs-exact-2-1-1 \
    && \    
    npm cache clean -f && \
    rm -rf node_modules/moment-timezone/data/unpacked && \
    rm -rf node_modules/moment/min && \
    rm -rf /tmp/*

ADD run.sh /usr/src/app/run.sh  
COPY . /usr/src/app

ENV NODE_ENV production
ENV electron:strategy electron-ipc
ENV phantom:strategy phantom-server
ENV tasks:strategy http-server
ENV chrome-pdf:launchOptions:executablePath google-chrome-unstable
ENV chrome-pdf:launchOptions:args --no-sandbox

CMD ["bash", "/usr/src/app/run.sh"]
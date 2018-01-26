FROM ubuntu:xenial
MAINTAINER Jan Blaha
EXPOSE 5488

RUN adduser --disabled-password --gecos "" jsreport && \
    apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -sL https://deb.nodesource.com/setup_6.x | bash - && \
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
    && \
    rm -rf /tmp/* /var/lib/apt/lists/* /var/cache/apt/* && \
    curl -Lo phantomjs.tar.bz2 https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-1.9.8-linux-x86_64.tar.bz2 && \
    tar jxvf phantomjs.tar.bz2 && \
    chmod +x phantomjs-1.9.8-linux-x86_64/bin/phantomjs && \
    mv phantomjs-1.9.8-linux-x86_64/bin/phantomjs /usr/local/bin/ && \
    rm -rf phantomjs*

VOLUME ["/jsreport"]

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

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
    && \
    npm cache clean -f && \
    rm -rf node_modules/moment-timezone/data/unpacked && \
    rm -rf node_modules/moment/min

ADD run.sh /usr/src/app/run.sh
COPY . /usr/src/app

ENV NODE_ENV production
ENV electron:strategy electron-ipc
ENV phantom:strategy phantom-server
ENV tasks:strategy http-server

CMD ["bash", "/usr/src/app/run.sh"]

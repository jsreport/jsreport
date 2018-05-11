FROM ubuntu:bionic
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
    curl -o fop.zip apache.miloslavbrada.cz/xmlgraphics/fop/binaries/fop-2.1-bin.zip && \
    unzip fop.zip && \
    rm fop.zip && \
    chmod +x fop-2.1/fop && \
    # node
    curl -sL https://deb.nodesource.com/setup_8.x | bash - && \
    apt-get update && \
    apt-get install -y --no-install-recommends nodejs && \
    npm i -g npm && \
    # chrome
    apt-get install -y libgconf-2-4 && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    apt-get install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst --no-install-recommends && \
    # phantomjs
    curl -Lo phantomjs.tar.bz2 https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-1.9.8-linux-x86_64.tar.bz2 && \
    tar jxvf phantomjs.tar.bz2 && \
    chmod +x phantomjs-1.9.8-linux-x86_64/bin/phantomjs && \
    mv phantomjs-1.9.8-linux-x86_64/bin/phantomjs /usr/local/bin/ && \
    rm -rf phantomjs* && \
    # cleanup
    rm -rf /var/lib/apt/lists/* /var/cache/apt/* && \   
    rm -rf /src/*.deb    

VOLUME ["/jsreport"]

RUN mkdir -p /app
WORKDIR /app

# the chrome was already installed from apt-get
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true  

RUN npm install -g jsreport-cli && \
    jsreport init && \
    npm uninstall -g jsreport-cli

RUN npm install --save --save-exact jsreport-ejs \
        jsreport-pug \    
        jsreport-azure-storage \
        jsreport-pdf-password \       
        jsreport-phantom-pdf \
        jsreport-phantom-image \
        jsreport-mssql-store \
        jsreport-postgres-store \
        jsreport-mongodb-store \
        jsreport-wkhtmltopdf \
        jsreport-html-to-text \
        jsreport-fop-pdf \
        jsreport-html-embedded-in-docx \
        jsreport-fs-store-aws-s3-persistence \
        jsreport-fs-store-azure-storage-persistence \
        jsreport-fs-store-azure-sb-sync \
        jsreport-fs-store-aws-sns-sync \
        electron \
        jsreport-electron-pdf \    
        phantomjs-exact-2-1-1 \
    && \    
    npm cache clean -f && \  
    rm -rf /tmp/*

ADD run.sh /app/run.sh  
COPY . /app

ENV PATH "$PATH:/fop-2.1"
ENV NODE_ENV production
ENV electron:strategy electron-ipc
ENV phantom:strategy phantom-server
ENV templatingEngines:strategy http-server
ENV chrome:launchOptions:executablePath google-chrome-unstable
ENV chrome:launchOptions:args --no-sandbox

CMD ["bash", "/app/run.sh"]
FROM ubuntu:xenial-20200212
# not using ubuntu:bionic because phantomjs 1.9.8 does not work there
# (it contains a newer version of OpenSSL which can not be used with phantomjs)
EXPOSE 2000

RUN adduser --disabled-password --gecos "" jsreport && \
    apt-get update && \
    apt-get install -y --no-install-recommends libxss1 libgconf-2-4 libappindicator3-1 libxtst6 gnupg git curl wget ca-certificates && \
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
    wget https://github.com/webnicer/chrome-downloads/raw/master/x64.deb/google-chrome-stable_79.0.3945.130-1_amd64.deb && \
    dpkg -i ./google-chrome*.deb && \
    rm google-chrome*.deb && \
    # cleanup
    rm -rf /var/lib/apt/lists/* /var/cache/apt/* && \
    rm -rf /src/*.deb

RUN mkdir -p /app
RUN chown -R jsreport:jsreport /app
RUN rm -rf /tmp/*

USER jsreport:jsreport

ENV NVM_DIR /home/jsreport/.nvm
ENV NODE_VERSION 14.16.1

# node
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.2/install.sh | bash && \
    /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

WORKDIR /app

# the chrome was already installed from apt-get
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

COPY --chown=jsreport:jsreport packages/worker /app
COPY --chown=jsreport:jsreport packages/worker/build/package.build.json /app/package.json
RUN npm install --production
RUN npm cache clean -f && rm -rf /tmp/*

ENV extensions_assets /app/node_modules/jsreport-assets
ENV extensions_base /app/node_modules/jsreport-base
ENV extensions_browserClient /app/node_modules/jsreport-browser-client
ENV extensions_childTemplates /app/node_modules/jsreport-child-templates
ENV extensions_chromePdf /app/node_modules/jsreport-chrome-pdf
ENV extensions_data /app/node_modules/jsreport-data
ENV extensions_docx /app/node_modules/jsreport-docx
ENV extensions_express /app/node_modules/jsreport-express
ENV extensions_handlebars /app/node_modules/jsreport-handlebars
ENV extensions_htmlToXlsx /app/node_modules/jsreport-html-to-xlsx
ENV extensions_jsrender /app/node_modules/jsreport-jsrender
ENV extensions_localization /app/packages/jsreport-localization
ENV extensions_pdfUtils /app/node_modules/jsreport-pdf-utils
ENV extensions_pptx /app/node_modules/jsreport-pptx
ENV extensions_reports /app/node_modules/jsreport-reports
ENV extensions_scripts /app/node_modules/jsreport-scripts
ENV extensions_staticPdf /app/node_modules/jsreport-static-pdf
ENV extensions_text /app/node_modules/jsreport-text
ENV extensions_versionControl /app/node_modules/jsreport-version-control
ENV extensions_xlsx /app/node_modules/jsreport-xlsx

CMD ["node", "server.js"]

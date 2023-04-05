FROM jsreport/jsreport:3.11.1

RUN npm install jsreport@3.11.2
RUN npm cache clean -f && rm -rf /tmp/*

COPY ./packages/jsreport/docker/default/editConfig.js editConfig.js
COPY ./packages/jsreport/docker/default/run.sh run.sh
RUN node editConfig.js

RUN chown -R jsreport:jsreport /app

ENV chrome_launchOptions_executablePath /usr/lib/chromium/chrome
ENV chrome_launchOptions_args --no-sandbox,--disable-dev-shm-usage


CMD ["bash", "run.sh"]

FROM jsreport/jsreport:4.3.0

RUN npm install jsreport@4.3.1
RUN npm cache clean -f && rm -rf /tmp/*

COPY ./packages/jsreport/docker/default/editConfig.js editConfig.js
COPY ./packages/jsreport/docker/default/run.sh run.sh
RUN node editConfig.js

RUN chown -R jsreport:jsreport /app

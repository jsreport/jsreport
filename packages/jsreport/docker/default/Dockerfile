FROM jsreport/jsreport:4.3.0

RUN npm install jsreport@4.3.1
RUN npm cache clean -f && rm -rf /tmp/*

COPY --chown=jsreport:jsreport ./packages/jsreport/docker/default/editConfig.js editConfig.js
COPY --chown=jsreport:jsreport ./packages/jsreport/docker/default/run.sh run.sh
RUN node editConfig.js

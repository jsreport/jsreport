FROM jsreport/jsreport:2.9.0

# we want to preserve the chrome version of 2.7.2 and just update the jsreport
RUN npm install jsreport@2.10.0 && npm cache clean -f

COPY --chown=jsreport:jsreport run.sh /app/run.sh

CMD ["bash", "/app/run.sh"]

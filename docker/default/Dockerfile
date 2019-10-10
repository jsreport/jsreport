FROM jsreport/jsreport:2.6.0

# we want to preserver the chrome version of 2.6.0 and just update the jsreport
RUN npm install jsreport@2.6.1 && npm cache clean -f

CMD ["bash", "/app/run.sh"]

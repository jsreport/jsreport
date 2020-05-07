FROM jsreport/jsreport:2.7.2

# we want to preserve the chrome version of 2.7.1 and just update the jsreport
RUN npm install jsreport/jsreport && npm cache clean -f

CMD ["bash", "/app/run.sh"]

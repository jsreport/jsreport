FROM jsreport/jsreport:2.7.1

# we want to preserve the chrome version of 2.7.1 and just update the jsreport
RUN npm install jsreport@2.7.2 && npm cache clean -f

CMD ["bash", "/app/run.sh"]

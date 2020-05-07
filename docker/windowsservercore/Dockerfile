FROM mcr.microsoft.com/windows/servercore:ltsc2019
EXPOSE 5488

# install nodejs
RUN curl https://nodejs.org/dist/v12.16.2/node-v12.16.2-x64.msi --output nodejs.msi
RUN msiexec.exe /q /i nodejs.msi
RUN del /f nodejs.msi

# fonts for chrome https://github.com/gantrior/docker-chrome-windows
ADD FontsToAdd.tar /fonts/
WORKDIR /fonts
SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]
RUN .\Add-Font.ps1 fonts
SHELL ["cmd", "/S", "/C"]

WORKDIR /app

# install jsreport
RUN npm install -g jsreport-cli && \
    jsreport init jsreport/jsreport && \
    npm uninstall -g jsreport-cli && \
    npm cache clean -f

# volume for custom mount
VOLUME c:\\jsreport
ADD run.js /app/run.js
COPY editConfig.js /app/editConfig.js
RUN node editConfig.js


ENV chrome_launchOptions_args --no-sandbox,--disable-dev-shm-usage
CMD ["node", "run.js"]

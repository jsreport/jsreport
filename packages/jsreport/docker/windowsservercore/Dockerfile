FROM mcr.microsoft.com/windows/servercore:ltsc2019
EXPOSE 5488

# install nodejs
ADD https://nodejs.org/dist/v16.12.0/node-v16.12.0-x64.msi nodejs.msi
RUN msiexec.exe /q /i nodejs.msi
RUN del /f nodejs.msi

# fonts for chrome https://github.com/gantrior/docker-chrome-windows
ADD ./packages/jsreport/docker/windowsservercore/FontsToAdd.tar /fonts/
WORKDIR /fonts
SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]
RUN .\Add-Font.ps1 fonts
SHELL ["cmd", "/S", "/C"]

WORKDIR /app

# NOTE this can fail localy with EAI_AGAIN, in this case use docker build .... --network=xxxxx, find the working with docker network ls
# install jsreport
RUN npm i -g @jsreport/jsreport-cli
RUN jsreport init
RUN npm cache clean -f

# volume for custom mount
VOLUME c:\\jsreport
COPY ./packages/jsreport/docker/windowsservercore/run.js /app/run.js
COPY ./packages/jsreport/docker/windowsservercore/editConfig.js /app/editConfig.js
RUN node editConfig.js


ENV chrome_launchOptions_args --no-sandbox,--disable-dev-shm-usage
CMD ["node", "run.js"]

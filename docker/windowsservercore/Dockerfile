FROM mcr.microsoft.com/windows/servercore:ltsc2019
EXPOSE 5488

# Install Chocolatey
RUN powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))" && SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"

# Install git
RUN choco install git.install -y

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
    jsreport init 2.11.0 && \
    npm cache clean -f

# volume for custom mount
VOLUME c:\\jsreport
ADD run.js /app/run.js
COPY editConfig.js /app/editConfig.js
RUN node editConfig.js


ENV chrome_launchOptions_args --no-sandbox,--disable-dev-shm-usage
CMD ["node", "run.js"]

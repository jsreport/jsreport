
Tags
----

[jsreport/jsreport](https://hub.docker.com/r/jsreport/jsreport/) image is automatically pushed with adequate tags into [docker hub](https://www.docker.com/)  public repository in three variations:

- `jsreport/jsreport:3.8.0` ([Dockerfile](https://github.com/jsreport/jsreport/blob/3.8.0/packages/jsreport/docker/default/Dockerfile))  contains default installation from npm
- `jsreport/jsreport:3.8.0-full` ([Dockerfile](https://github.com/jsreport/jsreport/blob/3.8.0/packages/jsreport/docker/full/Dockerfile)) contains default installation plus all the custom extensions, see the list of installed extensions in the dockerfile
- `jsreport/jsreport:3.8.0-windowsservercore` ([Dockerfile](https://github.com/jsreport/jsreport/blob/3.8.0/packages/jsreport/docker/windowsservercore/Dockerfile)) contains default installation with windows server core based image. Use `c:\jsreport` for mounting volume.

You can find the list of all available tags and previous versions in the [tags tab](https://hub.docker.com/r/jsreport/jsreport/tags/)

Usage
-----

1. Install [Docker](https://www.docker.com/)
2. `sudo docker run -p 80:5488 jsreport/jsreport:3.8.0`

This is the most basic usage. It will start jsreport server on port 80 directly in the current shell with data and configuration stored directly in the container. Change 80 http port to whatever you want.

The full documentation for the jsreport official images can be found at https://jsreport.net/learn/docker

Usage on macOS M1 hardware
--------------------------

To run the docker images on macOS with M1 hardware, you need to use the `--platform linux/amd64` flag and pass some additional chrome options. The docker run command for it looks like this:

```sh
docker run --platform=linux/amd64 -p 5488:5488 -e "chrome_launchOptions_executablePath=/usr/bin/chromium-browser" -e "chrome_launchOptions_args=--no-sandbox, --disable-dev-shm-usage, --disable-dev-profile, --no-zygote, --disable-gpu, --disable-audio-output, --disable-setuid-sandbox, --single-process" jsreport/jsreport:3.8.0
```

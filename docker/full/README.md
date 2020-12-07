
Tags
----

[jsreport/jsreport](https://hub.docker.com/r/jsreport/jsreport/) image is automatically pushed with adequate tags into [docker hub](https://www.docker.com/)  public repository in three variations:

- `jsreport/jsreport:2.11.0` ([Dockerfile](https://github.com/jsreport/jsreport/blob/master/docker/default/Dockerfile))  contains default installation from npm
- `jsreport/jsreport:2.11.0-full` ([Dockerfile](https://github.com/jsreport/jsreport/blob/master/docker/full/Dockerfile)) contains default installation plus all the custom extensions, see the list of installed extensions in the dockerfile
- `jsreport/jsreport:2.11.0-windowsservercore` ([Dockerfile](https://github.com/jsreport/jsreport/blob/master/docker/windowsservercore/Dockerfile)) contains default installation with windows server core based image. Use `c:\jsreport` for mounting volume.

You can find the list of all available tags and previous versions in the [tags tab](https://hub.docker.com/r/jsreport/jsreport/tags/)

Usage
-----

1. Install [Docker](https://www.docker.com/)
2. `sudo docker run -p 80:5488 jsreport/jsreport:2.11.0`

This is the most basic usage. It will start jsreport server on port 80 directly in the current shell with data and configuration stored directly in the container. Change 80 http port to whatever you want.

The full documentation for the jsreport official images can be found at https://jsreport.net/learn/docker

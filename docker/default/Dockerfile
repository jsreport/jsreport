FROM ubuntu:yakkety
MAINTAINER Jan Blaha
EXPOSE 5488

RUN apt-get update && apt-get install -y curl sudo && \
    curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash - && \
    apt-get install -y nodejs libgtk2.0-dev libxtst-dev libxss1 libgconf2-dev libnss3-dev libasound2-dev

RUN adduser --disabled-password --gecos "" jsreport
RUN echo "jsreport ALL=(root) NOPASSWD: /usr/local/bin/node" >> /etc/sudoers
RUN echo "jsreport ALL=(root) NOPASSWD: /usr/local/bin/npm" >> /etc/sudoers

VOLUME ["/jsreport"]

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN sudo npm install jsreport --production
RUN sudo node node_modules/jsreport --init

ADD run.sh /usr/src/app/run.sh
COPY . /usr/src/app

ENV NODE_ENV production
ENV phantom:strategy phantom-server
ENV tasks:strategy http-server

CMD ["bash", "/usr/src/app/run.sh"]
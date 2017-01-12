# file run.sh
#!/bin/sh

if [ -d "/jsreport" ]; then
  # link data folder from mounted volume

  if [ ! -d "/jsreport/data" ]; then
    mkdir "/jsreport/data"
  fi

  ln -nsf "/jsreport/data" "/usr/src/app/data"

  # copy default config

  if [ ! -f "/jsreport/prod.config.json" ]; then
    cp "/usr/src/app/prod.config.json" "/jsreport/prod.config.json"
  fi

  if [ ! -f "/jsreport/dev.config.json" ]; then
      cp "/usr/src/app/dev.config.json" "/jsreport/dev.config.json"
  fi

  # delete default config and link from volume

  rm -f "/usr/src/app/prod.config.json"
  ln -s "/jsreport/prod.config.json" "/usr/src/app/prod.config.json"

  rm -f "/usr/src/app/dev.config.json"
  ln -s "/jsreport/dev.config.json" "/usr/src/app/dev.config.json"

  chown -R jsreport:jsreport /jsreport
fi

su jsreport

node "/usr/src/app/server.js"
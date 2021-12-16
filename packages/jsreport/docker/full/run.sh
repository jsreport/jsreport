# file run.sh
#!/bin/sh

if [ "$(ls -A /jsreport)" ]; then
  echo "linking config files and data with mounted /jsreport volume"

  if [ ! -d "/jsreport/data" ]; then
    mkdir "/jsreport/data"
  fi

  ln -nsf "/jsreport/data" "/app/data"

  # copy default config
  if [ ! -f "/jsreport/jsreport.config.json" ]; then
    cp "/app/jsreport.config.json" "/jsreport/jsreport.config.json"
  fi

  ln -s "/jsreport/license-key.txt" "/app/license-key.txt"
  ln -s "/jsreport/jsreport.license.json" "/app/jsreport.license.json"

  rm -f "/app/jsreport.config.json"
  ln -s "/jsreport/jsreport.config.json" "/app/jsreport.config.json"

  chown -R jsreport:jsreport /jsreport
fi

if [ "$(id -u)" = '0' ]; then
  # If we are root, run the app as the lower-privilege `jsreport` user
  exec gosu jsreport node "server.js"  
else
  # If we're not root, we can't use `gosu` (and don't need to)
  exec node "server.js"
fi
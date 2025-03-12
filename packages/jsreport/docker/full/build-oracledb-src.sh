#!/bin/sh
# make the script to fail on commands that returns non-zero exit code
set -e

rm -rf /app/node_modules/oracledb
git clone --recurse-submodules https://github.com/oracle/node-oracledb /app/oracledb-src
cd /app/oracledb-src
git checkout tags/v$1
git submodule update
npm run buildbinary
npm run buildpackage
mkdir oracledb-$1
tar -xzf oracledb-$1.tgz -C oracledb-$1
mkdir /app/node_modules/oracledb
mv -v /app/oracledb-src/oracledb-$1/package/* /app/node_modules/oracledb
rm -rf /app/oracledb-src
cd /app
echo "finished oracledb build"

#!/bin/sh
# make the script to fail on commands that returns non-zero exit code
set -e

rm -rf /app/node_modules/oracledb
curl -L https://github.com/oracle/node-oracledb/releases/download/v$1/oracledb-src-$1.tgz > oracledb-src.tgz
mkdir /app/oracledb-src
tar -xzf oracledb-src.tgz -C /app/oracledb-src
cd /app/oracledb-src/package
npm run buildbinary
npm run buildpackage
mkdir oracledb-$1
tar -xzf oracledb-$1.tgz -C oracledb-$1
mkdir /app/node_modules/oracledb
mv -v /app/oracledb-src/package/oracledb-$1/package/* /app/node_modules/oracledb
cd /app
rm -f oracledb-src.tgz
rm -rf /app/oracledb-src
echo "finished oracledb build"

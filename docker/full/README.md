Tags
----

[jsreport/jsreport](https://hub.docker.com/r/jsreport/jsreport/) image is automatically pushed with adequate tags into [docker hub](https://www.docker.com/)  public repository in two variations:

- `jsreport/jsreport:1.8.2` ([Dockerfile](https://github.com/jsreport/jsreport/blob/master/docker/default/Dockerfile))  contains default installation from npm
- `jsreport/jsreport:1.8.2-full` ([Dockerfile](https://github.com/jsreport/jsreport/blob/master/docker/full/Dockerfile)) contains default installation plus all the community extensions including [wkhtmltopdf](http://jsreport.net/learn/wkhtmltopdf) or [electron](https://github.com/bjrmatos/jsreport-electron-pdf) recipes

Usage
-----

1. Install [Docker](https://www.docker.com/)
2. `sudo docker run -p 80:5488 jsreport/jsreport`

This is the most basic usage. It will start jsreport server on port 80 directly in the current shell with data and configuration stored directly in container. Change 80 http port to whatever you want.

Start on reboot
---------------

You may want to additionally run the container as daemon and restart it on system reboot
```sh
sudo docker run -d -p 80:5488 --restart always jsreport/jsreport
```

Configuring jsreport
--------------------

The easiest way is to pass the [configuration](https://jsreport.net/learn/configuration) as environment variables. The [authentication](http://jsreport.net/learn/authentication) can be for example applied in this way

```sh
sudo docker run -e "authentication_enabled=true" -e "authentication_admin_password=xxx" -p 80:5488 jsreport/jsreport
```

Notice that `_` is used as a separator for nested configuration properties. This works usually better in docker environments than also supported `:` separator.


Persist templates
-----------------

The templates are by default persisted inside the container. You may rather want to store them in a mounted directory or in an external database.

Mount directory
---------------

To mount directory with data you need to create directory `/jsreport-home` first and then run docker as
```sh
sudo docker run -p 80:5488 -v /jsreport-home:/jsreport jsreport/jsreport`
```
Note that you can also create `prod.config.json` inside the mounted directory and reconfigure jsreport before starting it.

Persist in external database
----------------------------

The full image like `jsreport/jsreport:1.8.2-full` has all the custom data stores like [mongodb](https://github.com/jsreport/jsreport-mongodb-store), [mssql](https://github.com/jsreport/jsreport-mssql-store) or [PostgreSQL](https://github.com/jsreport/jsreport-postgres-store) already installed. You only need to properly configure the `connectionString` environment variable. For example

```sh
sudo docker run -e "connectionString_name=mssql" -e "connectionString_uri=Server=tcp:jsreport.database.windows.net,1433;Initial Catalog=jsreport;Persist Security Info=False;User ID=myuser;Password=password;MultipleActiveResultSets=False;Encrypt=True;" -p 80:5488 jsreport/jsreport:1.8.2-full`
```
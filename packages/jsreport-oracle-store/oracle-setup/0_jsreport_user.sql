ALTER SESSION SET CONTAINER = XEPDB1;

create user JSREPORT identified by jsreport default tablespace users temporary tablespace temp;
alter user JSREPORT quota unlimited on users;
grant create session to JSREPORT;
grant create table to JSREPORT;
grant create any index to JSREPORT;
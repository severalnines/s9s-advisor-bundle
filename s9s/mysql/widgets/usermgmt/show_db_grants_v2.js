#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"



/**
 *

global privs
   db = * && table = * && user = * && host=*  : check all databases
   db = * table = * backupuser 127.0.0.1 *
privs on a particular database for a particular user host
  db = anyvalue && table = *  && user = value && host = value

privs on a particular database for all users
  db = anyvalue && table = *  && user = * && host = *


privs on a particular database for a particular table for a particular user host
   db = dbname && table = tablename && user = value && host = value
*/

function main(mydb, user, hostname, hostAndPort)
{
    var hosts          = cluster::mySqlNodes();
    var result         = {};
    var value          = {};
    result["accounts"] = {};
    var query = "";
    query = "SELECT grantee as account, table_schema as db, group_concat(privilege_type separator ',') as privileges, "
    + "group_concat(is_grantable separator ',') as grantable "
    + "from information_schema.schema_privileges "
    + "WHERE 1=1";

    if (mydb != #N/A && mydb != "" && mydb != "*")
    {
        query += " AND table_schema='" + mydb + "'";
    }

    if (user != #N/A && user !="" && user != "*")
    {
        query += " AND grantee like '%" + user + "%'";
    }

    if (hostname != #N/A && hostname !="" && hostname != "*")
    {
        query += " AND grantee like '%@" + hostname + "%'";
    }

    query += " group by grantee, table_schema order by grantee asc";

    i = 0;
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host = hosts[idx];
        map  = host.toMap();

        if(!hostMatchesFilter(host,hostAndPort))
            continue;

        connected     = map["connected"];
        if (!connected)
            continue;

        isGalera  = map["isgalera"];
        if (isGalera)
        {
            localState = map["galera"]["localstatusstr"];
            if (localState != "Synced")
                continue;
        }

        retval = getResultSet(host, query);

        if (retval != false)
        {
            var resultSet = retval["result"];
            nRows  = resultSet.rows();
            if (nRows==0)
                continue;
            result["accounts"][idx]                    = {};
            result["accounts"][idx]["report_host"]     = host.toString();
            result["accounts"][idx]["report_hostname"] = host.hostName();
            result["accounts"][idx]["report_port"]     = host.port();

            for (row = 0; row < nRows; ++row)
            {
                result["accounts"][idx][i]={};

                account              = resultSet[row, 0];
                db                   = resultSet[row, 1];
                privs                = resultSet[row, 2];
                grantable            = resultSet[row, 3];

                result["accounts"][idx][i]["report_hostname"]      = host.hostName();
                result["accounts"][idx][i]["report_port"]          = host.port();
                result["accounts"][idx][i]["account"]              = account;
                result["accounts"][idx][i]["db"]                   = db;
                result["accounts"][idx][i]["table"]                = "*";
                result["accounts"][idx][i]["db.table"]             = db + ".*";
                result["accounts"][idx][i]["privileges"]           = privs;
                result["accounts"][idx][i]["grantable"]            = grantable;
                result["accounts"][idx][i]["is_grantable"]         = false;

                if (grantable.contains("YES"))
                {
                    result["accounts"][idx][i]["is_grantable"] = true;
                }

                i++;
            }
        }
    }
    exit(result);
}

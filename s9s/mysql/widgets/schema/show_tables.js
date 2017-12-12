#include "common/helpers.js"
#include "common/mysql_helper.js"
#include "cmon/io.h"

/**
 * List tables for a specified db.
 * Format:  db hostAndPort
 * db: schema name or wildcard
 * hostAndPort : * for all hosts or e.g 10.10.10.10:3306
 */

// deprecated query:
query="select TABLE_NAME from INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA LIKE '%@@SCHEMA_NAME@@%' ORDER BY TABLE_NAME ASC";
var query2="SELECT count(table_name)"
" FROM information_schema.tables"
" WHERE table_schema "
"NOT IN ('mysql', 'INFORMATION_SCHEMA','performance_schema', 'ndbinfo')";

query1="USE @@SCHEMA_NAME@@";
query2="SHOW TABLES";


var MAX_TABLES=4096;


function main(db, hostAndPort) {
    var result={};

    if (db == #N/A)
    {
        resul["errorMessage"] = "'db' is no specified.";
        result["success"]=false;
        exit(result);
    }

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var result={};
    result["tables"] = [];

    var hosts = cluster::mySqlNodes();
    var k = 0;
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        if(hostAndPort != "*" && !hostMatchesFilter(host,hostAndPort))
            continue;

        map = host.toMap();
        connected = map["connected"];
        if (connected) {
            query1.replace("@@SCHEMA_NAME@@", db);
            executeSqlCommand2(host, query1);
            ret = getValueMap(host, query2);

            if (ret != false && ret.size() > 0)
            {
                for (i=0; i<ret.size(); ++i)
                {
                    result["tables"][k] = {};
                    result["tables"][k]["hostname"] = host.hostName();
                    result["tables"][k]["port"] = host.port();
                    result["tables"][k]["name"] = ret[i][0];
                    result["tables"][k]["schema"] =  db;

                    print("<tr><td>" + ret[i][0] + "&nbsp;&nbsp;</td>"
                          "</td></tr>");
                    k++;
                }
            }

        } else {
            print ("Not connected to " + host);
        }
    }
    exit(result);
}

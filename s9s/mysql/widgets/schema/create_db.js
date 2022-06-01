#include "common/helpers.js"
#include "common/mysql_helper.js"
#include "cmon/io.h"

/**
 * 
 * Format:  hostAndPort  variable value
 * hostAndPort : e.g 10.10.10.10:3306
 * variable: string
 * value: string
 */


function main(db) {
    var result = {};
    result["success"]=false;

    if (db == #N/A )
    {
        exit(result);
    }

    var hosts = cluster::mySqlNodes();
    var success = false;
    var isGaleraCluster = false;
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        if(host.nodeType() == "galera" )
        {
            isGaleraCluster = true;
            break;
        }
    }
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        map = host.toMap();
        connected = map["connected"];

        if (connected)
        {
            q = "CREATE DATABASE IF NOT EXISTS " + db;
            if(host.nodeType() == "galera" && isGaleraCluster)
            {
                st = map["galera"]["localstatus"];
                if (st != 4)
                    continue;
                result = executeSqlCommand2(host, q);
            }
            if(host.nodeType() == "mysql" && !isGaleraCluster )
            {
                readonly = map["readonly"];
                print(host);
                if (readonly)
                    continue;
                result = executeSqlCommand2(host, q);
            }


            if (result["success"] == false)
            {
                print(host.toString(), " : ", result["errorMessage"]);
                result["success"] = false;
                resul["errorMessage"] = result["errorMessage"];
            }
            else
            {
                print(host.toString(), " : created database '" , db , "'");
                success = true;
                result["success"] = true;
                resul["errorMessage"] = result["errorMessage"];
            }
            break;
        }
    }
    result["success"] = success;
    exit(result);
}


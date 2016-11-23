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
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        map = host.toMap();
        connected = map["connected"];
        if (connected)
        {
            if(host.nodeType() == "galera")
                host.executeSqlCommand("SET WSREP_ON=OFF");
    
            host.executeSqlCommand("SET SQL_LOG_BIN=0");
            q = "CREATE DATABASE IF NOT EXISTS " + db;
            result = executeSqlCommand2(host, q);
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
            host.executeSqlCommand("SET SQL_LOG_BIN=1");
            if(host.nodeType() == "galera")
                host.executeSqlCommand("SET WSREP_ON=ON");


        }
    }
    result["success"] = success;
    exit(result);
}



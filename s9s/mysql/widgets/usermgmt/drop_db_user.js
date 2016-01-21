#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

/**
* Drops the user specified by the argument userhost.
* Format:  user hostname hostAndPort
* hostAndPort : DROP on particular host/port 
*/

function main(user, hostname, hostAndPort)
{

    var result = {};
    if (user.toString() == "" || user.toString() == "#N/A" ||
        user.empty())
    {
        result["error_msg"] = "Argument 'user' not specified"; 
        print(result["error_msg"]);
        exit(result);
    }
    
    if (hostname.toString() == "" || hostname.toString() == "#N/A" ||
        hostname.empty())
    {
        result["error_msg"] = "Argument 'hostname' not specified"; 
        print(result["error_msg"]);
        exit(result);
    }
    var hosts     = cluster::mySqlNodes();
        
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        if(!hostMatchesFilter(host,hostAndPort))
            continue;
        map         = host.toMap();
        connected     = map["connected"];
        if (!connected)
            continue;
            
        isGalera  = map["isgalera"];
        
        if (isGalera)
            query = "SET WSREP_ON=ON;";
        else
            query = "SET SQL_LOG_BIN=OFF;";
        executeSqlCommand2(host, query);
        if (user == "*")
              user = "";
        query = "DROP USER '" + user + "'@'" + hostname + "'";
        //print(query);
        var retval = executeSqlCommand2(host, query);
        print(retval);
        if (!retval["success"])
            result["error_msg"] = retval["errorMessage"];
        else
           result["error_msg"] = "Dropped user " + user + "'@'" + hostname + "'";
        print(host, ":");
        print(result["error_msg"]);
        if (isGalera)
            query = "SET WSREP_ON=OFF;";
        executeSqlCommand2(host, query);
     }
     exit(result);
}

#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

/**
* grant the user on hostname with privs on db.
* Format:  'user' 'hostname' privs db xtraOpts
* All args except xtraOpts are required.
* xtraOpts: e.g WITH GRANT OPTION or REQUIRE SSL.. free text string.
           should be set to ''
* hostAndPort : GRANT on particular host/port 
*/

function main(user, hostname, privs, db, xtraOpts, hostAndPort)
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
    
    if (privs.toString() == "" || privs.toString() == "#N/A" ||
        privs.empty())
    {
        result["error_msg"] = "Argument 'privs' not specified"; 
        print(result["error_msg"]);
        exit(result);
    }
    
    if (db.toString() == "" || db.toString() == "#N/A" ||
        db.empty())
    {
        result["error_msg"] = "Argument 'db' not specified"; 
        print(result["error_msg"]);
        exit(result);
    }

  
    if (xtraOpts.toString() == "" || xtraOpts.toString() == "#N/A" ||
        xtraOpts.empty())
    {
        xtraOpts = "";
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

        query = "GRANT " + privs + " ON " + db
                      + " TO '" + user + "'@'" 
                      + hostname + "' "+ xtraOpts ;
                      
        var retval = executeSqlCommand2(host, query);
        print(retval);
        if (!retval["success"])
            result["error_msg"] = retval["errorMessage"];
        else
           result["error_msg"] = "Successfully executed: " + query;  
           
        print(host, ":");
        print(result["error_msg"]);

        if (isGalera)
            query = "SET WSREP_ON=OFF;";
        executeSqlCommand2(host, query);
     }
     exit(result);
}



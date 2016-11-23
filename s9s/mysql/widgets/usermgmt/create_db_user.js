#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

/**
* creates the user specified by the arguments
* Format:  user hostname hostAndPort
* hostAndPort : create on particular host/port 
*/

function main(user, hostname, password, hostAndPort)
{

    var result = {};
    if (user.toString() == "" || user == #N/A ||
        user.empty())
    {
        result["error_msg"] = "Argument 'user' not specified"; 
        print(result["error_msg"]);
        exit(result);
    }
    
    if (hostname.toString() == "" || hostname == #N/A ||
        hostname.empty())
    {
        result["error_msg"] = "Argument 'hostname' not specified"; 
        print(result["error_msg"]);
        exit(result);
    }
    
    if (password.toString() == "" || password == #N/A ||
        password.empty())
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

        query = "SELECT COUNT(user) FROM mysql.user WHERE user='" + user 
                + "' AND host='" + hostname + "'";
    
        var retval = getResultSet(host,query);
        var cnt = 0;
        if (!retval["success"])
        {
            result["error_msg"] = retval["errorMessage"]; 
        }
        else
        {
            resultSet = retval["result"];
            cnt = resultSet[0, 0];
        }
        if (cnt.toInt() == 0)
        {
            query = "CREATE USER '" + user + "'@'" + hostname + 
                    "' IDENTIFIED BY '" + password + "'";
            //print(query);
            
            retval = executeSqlCommand2(host, query);
            if (!retval["success"])
                result["error_msg"] = retval["errorMessage"];
            else
               result["error_msg"] = "Successfully created user '" 
                    + user + "'@'" + hostname + "'";
        }
        else
        {
            query = "SET PASSWORD FOR '" + user + "'@'" + hostname 
                    + "' = PASSWORD('"  +  password + "')"; 
            retval = executeSqlCommand2(host, query);
            if (!retval["success"])
                result["error_msg"] = retval["errorMessage"];
            else
               result["error_msg"] = "Successfully changed password for '" 
                + user + "'@'" + hostname + "'";
        }
        print (result["error_msg"]);
        if (isGalera)
        {
            query = "SET WSREP_ON=OFF;";
            executeSqlCommand2(host, query);
            break;
        }
     }
     exit(result);
}


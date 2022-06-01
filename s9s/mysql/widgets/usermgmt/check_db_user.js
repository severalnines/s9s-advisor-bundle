#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

/**
* checks if the user exists specified by the arguments
* Format:  user hostname hostAndPort
* hostAndPort : create on particular host/port
*/

function main(user, hostname, hostAndPort)
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

    var hosts = cluster::mySqlNodes();
    var query = "";
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
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

        query = "SELECT COUNT(user) FROM mysql.user WHERE user='" + user
                + "' AND host='" + hostname + "'";

        executeSqlCommand2(host, query);

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
            if (cnt == "1") 
            {
                result["db_user_exists"] = true;
            }
            else 
            {
                result["db_user_exists"] = false;
            }
        }
        print(result);
        break;
    }
    exit(result);
}

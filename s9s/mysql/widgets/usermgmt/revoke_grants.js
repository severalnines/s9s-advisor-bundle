#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

/**
* drops all privileges for a user@hostname.
* Format:  'user' 'hostname
*/
function main(user, hostname)
{
    var result = {};

    if (user.toString() == "" || user.toString() == "#N/A" || user.empty()) {
        result["error_msg"] = "Argument 'user' not specified";
        print(result["error_msg"]);
        exit(result);
    }

    if (hostname.toString() == "" || hostname.toString() == "#N/A" || hostname.empty()) {
        result["error_msg"] = "Argument 'hostname' not specified";
        print(result["error_msg"]);
        exit(result);
    }

    var hosts = cluster::mySqlNodes();
    var retval2;
    var host;
    var map ;
    var connected;
    var isGalera;
    for (idx = 0; idx < hosts.size(); ++idx)
    {

        host = hosts[idx];

        map = host.toMap();
        connected = map["connected"];

        if (!connected) {
            continue;
        }

        isGalera  = map["isgalera"];
        if (isGalera) {
            localState = map["galera"]["localstatusstr"];
            if (localState != "Synced")
                continue;
            query = "SET WSREP_ON=ON;SET SQL_LOG_BIN=ON;";
            retval2 = executeSqlCommand2(host, query);
        }
        else {
            isReadOnly = map["readonly"].toBoolean();
            if (isReadOnly)
                {
                    continue;
                }
                query = "SET SQL_LOG_BIN=ON;";
                retval2 = executeSqlCommand2(host, query);
        }

        query = "REVOKE ALL PRIVILEGES, GRANT OPTION"
        + " FROM '" + user + "'@'"
        + hostname + "'";

        print (query);
        retval = executeSqlCommand2(host, query);
        if(!retval['success']) {
            result['error_msg'] = retval['errorMessage'];
        } else {
            result["error_msg"] = "Successfully dropped all privileges for: '" + user + "'@'" + hostname + "'";
        }

        if (isGalera)
        {
            query = "SET WSREP_ON=OFF;SET SQL_LOG_BIN=OFF;";
        }
        else
        {
            query = "SET SQL_LOG_BIN=OFF;";
        }

        break;
    }
    exit(result);
}

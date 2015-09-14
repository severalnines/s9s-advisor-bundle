#include "common/helpers.js"
#include "common/mysql_helper.js"
#include "cmon/io.h"

/**
 * Kill a query based on ID
 * Format:  qid  hostAndPort
 * qid: id of query to be killed
 * hostAndPort : * for all hosts or 10.10.10.10:3306 
 */


function main(qid, hostAndPort) {
    var hosts = cluster::mySqlNodes();
    var result = {};
    result["success"] = false;
    result["errorMessage"] = "unknown error";
    if (hostAndPort == #N/A)
    {
        result["errorMessage"] = "Wrong arguments.";
        return result;
    }
    if (qid == #N/A)
    {
        result["errorMessage"] = "Wrong arguments.";
        return result;
    }
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        if(!hostMatchesFilter(host,hostAndPort))
        {
            continue;
        }
        result["hostname"] = host.hostName();
        result["port"] = host.port();   
        map = host.toMap();
        connected = map["connected"];
        if (connected) {
            query = "kill " + qid;
            retval = executeSqlCommand2(host, query);
            if (retval["success"])
            {
                print("Succesfully executed " + query + ".");
                result["errorMessage"] = "Succesfully executed " + query + ".";
            }
            else
            {
                print("Failed to execute " + query + ".");
                result["errorMessage"] = retval["errorMessage"].toString();
            }
            result["success"] = retval["success"];
            print("-- " + CmonDateTime::currentDateTime().toString(MySqlLogFileFormat) + " --");
        } else {
            print ("Not connected to " + host);
            result["errorMessage"] = "Not connected to " + host;
        }
    }
    return result;
}

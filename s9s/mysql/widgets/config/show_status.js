#include "common/helpers.js"
#include "common/mysql_helper.js"
#include "cmon/io.h"

/**
 * show full processlist
 * Format:  hostAndPort
 * hostAndPort : * for all hosts or 10.10.10.10:3306 
 */


function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var result={};
    result["status"] = {};
    result["status"]["global"]={};

    var hosts = cluster::mySqlNodes();
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        if(hostAndPort != "*" && !hostMatchesFilter(host,hostAndPort))
            continue;

        map = host.toMap();
        connected = map["connected"];
        if (connected) {
            ret = getValueMap(host, "SHOW GLOBAL STATUS");
    
            if (ret != false && ret.size() > 0)
            {
                result["status"]["global"][idx]={};
                result["status"]["global"][idx]["reported_by"]=host.toString();
                for (i=0; i<ret.size(); ++i)
                {
                    result["status"]["global"][idx][i]={};
                    result["status"]["global"][idx][i]["variable_name"]=ret[i][0];
                    result["status"]["global"][idx][i]["value"]=ret[i][1];

                }
            }
        }
    }
    exit(result);
}


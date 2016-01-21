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
    result["processlist"] = {};
    result["processlist"]["process"]={};

    var hosts = cluster::mySqlNodes();
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        if(hostAndPort != "*" && !hostMatchesFilter(host,hostAndPort))
            continue;

        map = host.toMap();
        connected = map["connected"];
        if (connected) {
            ret = getValueMap(host, "SHOW FULL PROCESSLIST");
    
            if (ret != false && ret.size() > 0)
            {
    
                for (i=0; i<ret.size(); ++i)
                {
                    result["processlist"]["process"][i]={};
                    result["processlist"]["process"][i]["reported_by"]=host.toString();
                    result["processlist"]["process"][i]["id"]=ret[i][0];
                    result["processlist"]["process"][i]["user"]=ret[i][1];
                    result["processlist"]["process"][i]["host"]=ret[i][2];
                    result["processlist"]["process"][i]["db"]=ret[i][3];
                    result["processlist"]["process"][i]["command"]=ret[i][4];
                    result["processlist"]["process"][i]["time"]=ret[i][5];
                    result["processlist"]["process"][i]["state"]=ret[i][6];
                    result["processlist"]["process"][i]["info"]=ret[i][7];
                }
            }
        }
    }
    exit(result);
}

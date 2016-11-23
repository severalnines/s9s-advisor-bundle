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

    var result= [];
    var k = 0;
    var hosts = cluster::mySqlNodes();
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        if(hostAndPort != "*" && !hostMatchesFilter(host,hostAndPort))
            continue;
                    if(k==11)
                    break;
        map = host.toMap();
        connected = map["connected"];
                        result["processlist"]["process"][idx]={};

        if (connected) {
            ret = getValueMap(host, "SHOW FULL PROCESSLIST");
    
            if (ret != false && ret.size() > 0)
            {

                for (i=0; i<ret.size(); ++i)
                {
                    result[k]={};
                    result[k]["reported_by"]=host.toString();
                    result[k]["id"]=ret[i][0];
                    result[k]["user"]=ret[i][1];
                    result[k]["host"]=ret[i][2];
                    result[k]["db"]=ret[i][3];
                    result[k]["command"]=ret[i][4];
                    result[k]["time"]=ret[i][5];
                    result[k]["state"]=ret[i][6];
                    result[k]["info"]=ret[i][7];
                    k++;

                }
            }
        }
    }
    exit(result);
}

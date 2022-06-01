
#include "common/helpers.js"
#include "cmon/io.h"

/**
 * db.currentOp()
 * Format:  hostAndPort
 * hostAndPort : * for all hosts or 10.10.10.10:3306
 */


function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var hosts   = cluster::mongoNodes();
    var result= [];
    var k = 0;
    for (i = 0; i < hosts.size(); i++)
    {
        host        = hosts[i];
        if(hostAndPort != "*" && !hostMatchesFilter(host,hostAndPort))
            continue;
        if(host.hostStatus() != "CmonHostOnline")
            continue;

        res= host.executeMongoQuery("admin", '{"currentOp" : 1 }');
        r = res["result"]["inprog"];
        for(x = 0; x<r.size(); x++) {
            result[k]={};
            result[k]["reported_by"]=host.toString();
            result[k]["opid"]=r[x]['opid'];
            result[k]["active"]=r[x]['active'];
            result[k]["client"]=r[x]['client'];
            result[k]["connectionId"]=r[x]['connectionId'];
            result[k]["desc"]=r[x]['desc'];
            result[k]["threadId"]=r[x]['threadId'];
            result[k]["secs_running"]=r[x]['secs_running'];
            result[k]["op"]=r[x]['op'];
            result[k]["ns"]=r[x]['ns'];
            result[k]["query"]=r[x]['query'];
            result[k]["waitingForLock"]=r[x]['waitingForLock'];
            result[k]["connectionId"]=r[x]['connectionId'];
/*            result[k]["fsyncLock"]=r[x]['fsyncLock'];
            result[k]["deadlockCount"]=r[x]['lockStats']['deadlockCount'];
            */
//            These two are the "acquining r^w (us)"
            result[k]["timeAcquiringMicrosWriteIS"]=r[x]['lockStats']['Global']['timeAcquiringMicros']['w']['$numberLong'];
            result[k]["timeAcquiringMicrosReadIS"]=r[x]['lockStats']['Global']['timeAcquiringMicros']['r']['$numberLong'];

//            These two are new and should be the "acquining R^W (us)"
            result[k]["timeAcquiringMicrosWriteIX"]=r[x]['lockStats']['Global']['timeAcquiringMicros']['W']['$numberLong'];
            result[k]["timeAcquiringMicrosReadIX"]=r[x]['lockStats']['Global']['timeAcquiringMicros']['R']['$numberLong'];
            k++;
        }
    }
    exit(result);
}
 


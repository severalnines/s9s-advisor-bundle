
#include "common/helpers.js"
#include "cmon/io.h"
#include "cmon/alarms.h"

var WARNING_THRESHOLD=90;
var WARNING_LAG_SECONDS = 60;
var TITLE="Replication check";
var ADVICE_WARNING="Replication lag detected. ";
var ADVICE_OK="The replication is functioning fine." ;



function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var hosts   = cluster::mongoNodes();
    var advisorMap = {};
    var result= [];
    var k = 0;
    var advice = new CmonAdvice();
    var msg = "";
    for (i = 0; i < hosts.size(); i++)
    {
        // Find the master and execute the queries there
        host = hosts[i];
        res = host.executeMongoQuery("{isMaster: 1}");
        if (res["result"]["ismaster"] == true) {
            master_host = host;
            optime_master = 0;
            optime_nodes = [];
            res = host.executeMongoQuery("{ replSetGetStatus: 1 }");
            // Fetch the optime per host
            for(o = 0; o < res["result"]["members"].size(); o++)
            {
                node_status = res["result"]["members"][o];
                // Keep reference to the master host
                if (node_status["name"] == master_host)
                {
                    optime_master = o;
                }
                optime_nodes[o] = {};
                optime_nodes[o]["name"] = node_status["name"];
                optime_nodes[o]["optime"] = node_status["optime"]["ts"]["$timestamp"]["t"];
                    
            }
            // Check if any of the hosts is lagging
            for(o = 0; o < optime_nodes.size(); o++)
            {
                replication_lag = optime_nodes[optime_master]["optime"] - optime_nodes[o]["optime"];
                if(replication_lag > WARNING_LAG_SECONDS)
                {
                    advice.setSeverity(Warning);
                    msg = ADVICE_WARNING + "Host " + optime_nodes[o]["name"] + " has a replication lag of " + replication_lag + " seconds.";
                }
            }
            
            if (advice.severity() <= 0) {
                advice.setSeverity(Ok);
            }
        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advisorMap[i]= advice;
    }
    return advisorMap;
}

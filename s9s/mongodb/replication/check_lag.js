
#include "common/helpers.js"
#include "cmon/io.h"
#include "cmon/alarms.h"

var DESCRIPTION="This advisor collects the replication information of the primary every minute,"
                " then calculates the lag between the primary and secondaries in seconds and"
                " notifies you if the lag exceeds 60 seconds. This is important as Mongo client drivers"
                " tend to pick the least lagging secondaries and bringing more stress on these less laggy nodes.";
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
    var optime_nodes = [];
    var replica_set_primary_optime = {};
    var optime_nodes_i = 0;
    for (i = 0; i < hosts.size(); i++) {
        // Find the primary and execute the queries there
        host = hosts[i];

        if (host.role() == "shardsvr" || host.role() == "configsvr") {
            res = host.executeMongoQuery("admin", "{\"isMaster\": 1}");
            if (res["result"]["ismaster"] == true) {
                master_host = host.hostName() + ":" + host.port();
                optime_master = 0;
                res = host.executeMongoQuery("admin", "{ \"replSetGetStatus\": 1 }");
                // Fetch the optime per host
                for(o = 0; o < res["result"]["members"].size(); o++) {
                    node_status = res["result"]["members"][o];
                    optime_nodes[optime_nodes_i] = {};
                    optime_nodes[optime_nodes_i]["hostobj"] = host;
                    // Keep reference to the master host
                    if (node_status["name"] == master_host) {
                        optime_nodes[optime_nodes_i]['ismaster'] = true;
                        replica_set_primary_optime[res["result"]["set"]] = node_status["optime"]["ts"]["$timestamp"]["t"];
                    }
                    else {
                        optime_nodes[optime_nodes_i]['ismaster'] = false;
                    }
                    optime_nodes[optime_nodes_i]["setname"] = res["result"]["set"];
                    optime_nodes[optime_nodes_i]["name"] = node_status["name"];
                    optime_nodes[optime_nodes_i]["optime"] = node_status["optime"]["ts"]["$timestamp"]["t"];
                    optime_nodes_i++;
                }
            }
        }
    }
    // Check if any of the hosts is lagging
    for(o = 0; o < optime_nodes.size(); o++) {
        host = optime_nodes[o]["hostobj"];
        if (optime_nodes[o]['ismaster'] == true) {
            advice.setSeverity(Ok);
            msg = "Host " + optime_nodes[o]["name"] + " ( " + optime_nodes[o]["setname"] +" ) is the primary.";
        }
        else {
            replication_lag = replica_set_primary_optime[optime_nodes[o]["setname"]] - optime_nodes[o]["optime"];
            if(replication_lag > WARNING_LAG_SECONDS) {
                advice.setSeverity(Warning);
                msg = ADVICE_WARNING + "Host " + optime_nodes[o]["name"] + " ( " + optime_nodes[o]["setname"] +" ) has a replication lag of " + replication_lag + " seconds.";
            }
            else {
                advice.setSeverity(Ok);
                msg = "Host " + optime_nodes[o]["name"] + " ( " + optime_nodes[o]["setname"] +" ) has a replication lag of " + replication_lag + " seconds.";
            }
        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advisorMap[o]= advice;
    }
    return advisorMap;
}

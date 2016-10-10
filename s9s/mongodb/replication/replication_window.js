#include "common/helpers.js"
#include "cmon/io.h"
#include "cmon/alarms.h"

// It is advised to have a replication window of at least 24 hours
var WARNING_REPL_WINDOW = 24*60*60;
var TITLE="Replication window";
var ADVICE_WARNING="Replication window too short. ";
var ADVICE_OK="The replication window is long enough.";
var JUSTIFICATION_WARNING="It is advised to have a MongoDB replication window of at least 24 hours. You could try to increase the oplog size. See also: https://docs.mongodb.com/manual/tutorial/change-oplog-size/";



function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var hosts   = cluster::mongoNodes();
    var advisorMap = {};
    var result= [];
    var k = 0;
    var advice = new CmonAdvice();
    var msg = "";
    var max = 0;
    var min = 0;
    var replwindow = 0;
    for (i = 0; i < hosts.size(); i++)
    {
        // Find the primary and execute the queries there
        host = hosts[i];
        res = host.executeMongoQuery("admin", "{isMaster: 1}");
        if (res["result"]["ismaster"] == true) {
            master_host = host;
            optime_master = 0;
            optime_nodes = [];

            // Fetch the first and last record from the Oplog and take its timestamp
            res = host.executeMongoQuery("local", '{find: "oplog.rs", sort: { $natural: 1}, limit: 1}');
            min = res["result"]["cursor"]["firstBatch"][0]["ts"]["$timestamp"]["t"];
            res = host.executeMongoQuery("local", '{find: "oplog.rs", sort: { $natural: -1}, limit: 1}');
            max = res["result"]["cursor"]["firstBatch"][0]["ts"]["$timestamp"]["t"];
            replwindow = max - min;

            res = host.executeMongoQuery("admin", "{ replSetGetStatus: 1 }");
            // Fetch the optime and uptime per host
            for(o = 0; o < res["result"]["members"].size(); o++)
            {
                node_status = res["result"]["members"][o];
                optime_nodes[o] = {};
                optime_nodes[o]["name"] = node_status["name"];
                optime_nodes[o]["uptime"] = node_status["uptime"];
                optime_nodes[o]["optime"] = node_status["optime"]["ts"]["$timestamp"]["t"];
                // replication window of each node is last committed transaction minus the first item in the oplog of the master
                optime_nodes[o]["replwindow"] = node_status["optime"]["ts"]["$timestamp"]["t"]-min;
            }
        }
    }

    for (i = 0; i < optime_nodes.size(); i++)
    {
        msg = ADVICE_OK;
        host = optime_nodes[i]["name"];
        if(optime_nodes[i]["uptime"] < WARNING_REPL_WINDOW)
        {
            msg = "Host " + optime_nodes[i]["name"] + " only has an uptime of " + optime_nodes[i]["uptime"] + " seconds. Too early to determine the replication window.";
            advice.setSeverity(Ok);
        }
        else {
            // Check if any of the hosts is within the oplog window
            if(optime_nodes[i]["replwindow"] < WARNING_REPL_WINDOW)
            {
                advice.setSeverity(Warning);
                msg = ADVICE_WARNING + "Host " + optime_nodes[i]["name"] + " has a replication window of " + optime_nodes[optime_master]["replwindow"] + " seconds.";
                advice.setJustification(JUSTIFICATION_WARNING);
            } else {
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

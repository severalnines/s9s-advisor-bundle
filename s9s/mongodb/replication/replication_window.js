
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
        // Find the master and execute the queries there
        host = hosts[i];
        res = host.executeMongoQuery("admin", "{isMaster: 1}");
        if (res["result"]["ismaster"] == true) {
            master_host = host;
            optime_master = 0;
            optime_nodes = [];
            res = host.executeMongoQuery("local", '{aggregate: "oplog.rs", pipeline: [{$group: {"_id": null, min: {$min: "$ts"}, max: {$max: "$ts"}}}]}');
            max = res["result"]["result"][0]["max"]["$timestamp"]["t"];
            min = res["result"]["result"][0]["min"]["$timestamp"]["t"];
            replwindow = max - min;
            
            res = host.executeMongoQuery("admin", "{ replSetGetStatus: 1 }");
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
                // replication window of each node is last committed transaction minus the first item in the oplog of the master
                optime_nodes[o]["replwindow"] = node_status["optime"]["ts"]["$timestamp"]["t"]-min;
                
                    
            }
            msg = ADVICE_OK;
            // Check if any of the hosts is within the oplog window
            for(o = 0; o < optime_nodes.size(); o++)
            {
                if(optime_nodes[optime_master]["replwindow"] < WARNING_REPL_WINDOW)
                {
                    advice.setSeverity(Warning);
                    msg = ADVICE_WARNING + "Host " + optime_nodes[o]["name"] + " has a replication window of " + optime_nodes[optime_master]["replwindow"] + " seconds.";
                    advice.setJustification(JUSTIFICATION_WARNING);
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


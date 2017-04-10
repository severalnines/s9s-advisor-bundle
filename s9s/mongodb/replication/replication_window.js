#include "common/helpers.js"
#include "cmon/io.h"
#include "cmon/alarms.h"

// It is advised to have a replication window of at least 24 hours, critical is 1 hour
var DESCRIPTION="This advisor collects the first and the last oplog entry every minute from every host,"
                " calculates the time difference between the two and notifies you if the window"
                " is within the set threshold (less than 24 hours for warning, less than 1 hour for critical).";
var WARNING_REPL_WINDOW = 24*60*60;
var CRITICAL_REPL_WINDOW = 60*60;
var TITLE="Replication window";
var ADVICE_WARNING="Replication window too short. ";
var ADVICE_CRITICAL="Replication window too short for one hour of downtime / maintenance. ";
var ADVICE_OK="The replication window is long enough.";
var JUSTIFICATION_WARNING="It is advised to have a MongoDB replication window of at least 24 hours. You could try to increase the oplog size. See also: https://docs.mongodb.com/manual/tutorial/change-oplog-size/";
var JUSTIFICATION_CRITICAL=JUSTIFICATION_WARNING;


function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var hosts   = cluster::mongoNodes();
    var advisorMap = {};
    var result= [];
    var k = 0;
    var advice = new CmonAdvice();
    var msg = "";
    var replwindow_per_node = {};
    var replstatus_per_node = {};
    var replwindow = {};
    var replstatus = {};
    var replwindow_node = 0;
    var host_id = "";
    for (i = 0; i < hosts.size(); i++)
    {
        // Find the primary and execute the queries there
        host = hosts[i];
        host_id = host.hostName() + ":" + host.port();

        if (host.role() == "shardsvr" || host.role() == "configsvr") {
            // Get the replication window of each nodes in the cluster, and store it for later use
            replwindow_per_node[host_id] = getReplicationWindow(host);

            // Only retrieve the replication status from the master
            res = host.executeMongoQuery("admin", "{isMaster: 1}");
            if (res["result"]["ismaster"] == true) {
                var tmp = getReplicationStatus(host, host_id);
                for(o=0; o < tmp.size(); o++) {
                    replstatus_per_node[tmp[o]['name']] = tmp[o];
                }

                //replstatus_per_node =
            }
        }
    }

    for (i = 0; i < hosts.size(); i++)
    {
        host = hosts[i];
        if (host.role() == "shardsvr" || host.role() == "configsvr") {
            msg = ADVICE_OK;

            host_id = host.hostName() + ":" + host.port();
            primary_id = replstatus_per_node[host_id]['primary'];
            replwindow = replwindow_per_node[host_id];
            replstatus = replstatus_per_node[host_id];

            // Calculate the replication window of the primary against the node's last transaction
            replwindow_node = replstatus['optime'] - replwindow_per_node[primary_id]['first'];
            // First check uptime. If the node is up less than our replication window it is probably no use warning
            if(replwindow['newset'] == true) {
              msg = "Host " + host_id + " (" + replstatus["setname"] + ") is a new replicaSet. Not enough entries in the oplog to determine the replication window.";
              advice.setSeverity(Ok);
              advice.setJustification("");
            } else if (replstatus["uptime"] < WARNING_REPL_WINDOW) {
                msg = "Host " + host_id + " (" + replstatus["setname"] + ") only has an uptime of " + replstatus["uptime"] + " seconds. Too early to determine the replication window.";
                advice.setSeverity(Ok);
                advice.setJustification("");
            }
            else if (replwindow['max'] < (CmonDateTime::currentDateTime().toString("%s") - WARNING_REPL_WINDOW)) {
              msg = "Latest entry in the oplog for host " + host_id + " (" + replstatus["setname"] + ") is older than " + WARNING_REPL_WINDOW + " seconds. Determining the replication window would be unreliable.";
              advice.setSeverity(Ok);
              advice.setJustification("");
            }
            else {
                // Check if any of the hosts is within the oplog window
                if(replwindow_node < CRITICAL_REPL_WINDOW) {
                    advice.setSeverity(Critical);
                    msg = ADVICE_CRITICAL + "Host " + host_id + " (" + replstatus["setname"] + ") has a replication window of " + replwindow_node + " seconds.";
                    advice.setJustification(JUSTIFICATION_CRITICAL);
                } else {
                    if(replwindow_node < WARNING_REPL_WINDOW)
                    {
                        advice.setSeverity(Warning);
                        msg = ADVICE_WARNING + "Host " + host_id + " (" + replstatus["setname"] + ") has a replication window of " + replwindow_node + " seconds.";
                        advice.setJustification(JUSTIFICATION_WARNING);
                    } else {
                        msg = "The replication window for node " + host_id + " (" + replstatus["setname"] + ") is long enough.";
                        advice.setSeverity(Ok);
                        advice.setJustification("");
                    }
                }
            }

            advice.setHost(host);
            advice.setTitle(TITLE);
            advice.setAdvice(msg);
            advisorMap[i]= advice;
        }
    }
    return advisorMap;
}

function getReplicationStatus(host, primary_id) {
    var node_status = {};
    var res = host.executeMongoQuery("admin", "{ replSetGetStatus: 1 }");
    // Fetch the optime and uptime per host
    for(i = 0; i < res["result"]["members"].size(); i++)
    {
        tmp = res["result"]["members"][i];
        node_status[i] = {};
        node_status[i]["name"] = tmp["name"];;
        node_status[i]["primary"] = primary_id;
        node_status[i]["setname"] = res["result"]["set"];
        node_status[i]["uptime"] = tmp["uptime"];
        node_status[i]["optime"] = tmp["optime"]["ts"]["$timestamp"]["t"];
    }
    return node_status;
}

function getReplicationWindow(host) {
  var replwindow = {};
  replwindow['newset'] = false;
  // Fetch the first and last record from the Oplog and take it's timestamp
  var res = host.executeMongoQuery("local", '{find: "oplog.rs", sort: { $natural: 1}, limit: 1}');
  replwindow['first'] = res["result"]["cursor"]["firstBatch"][0]["ts"]["$timestamp"]["t"];
  if (res["result"]["cursor"]["firstBatch"][0]["o"]["msg"] == "initiating set") {
      replwindow['newset'] = true;
  }
  res = host.executeMongoQuery("local", '{find: "oplog.rs", sort: { $natural: -1}, limit: 1}');
  replwindow['last'] = res["result"]["cursor"]["firstBatch"][0]["ts"]["$timestamp"]["t"];
  replwindow['replwindow'] = replwindow['last'] - replwindow['first'];
  return replwindow;
}

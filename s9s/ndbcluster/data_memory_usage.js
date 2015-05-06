#include "common/mysql_helper.js"
#include "cmon/alarms.h"

/**
 * Checks data memory usage
 */
 
var TITLE = "Data Memory Usage";

var DATAMEMORY_WARNING = 80;
var DATAMEMORY_CRITICAL = 90;

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};
    var commands = {};
 
    for (idx = 0; idx < hosts.size(); idx++)
    {
        var advice = new CmonAdvice();
        advice.setTitle(TITLE);
        host        = hosts[idx];
        if (!host.connected())
        {
            continue;
        }
        var result = getValueMap(host, 
                                 "select node_id, used, total from"
                                 " ndbinfo.memoryusage where"
                                 " memory_type='Data memory'");
        if (result == false)
        {
            advice.setJustification("Failed to read DataMemory from ndbconfig.");
            advice.setSeverity(Warning);
            advice.setAdvice("Unknown Error.");
            advice.setHost(host);
            advisorMap[idx]= advice;
            return advisorMap;
        }
        for( i=0; i<result.size(); i++)
        {
            var nodeid= result[i][0];
            var used = result[i][1];
            var total = result[i][2];
            var usedPct = 100 * used / total;
            var msg = "NodeId " + nodeid  + ": " + usedPct.toInt() + 
                      "% DataMemory is used"; 
            advice.setJustification(msg);
            if (usedPct < DATAMEMORY_WARNING)
            {
             
                advice.setSeverity(Ok);
                advice.setAdvice("DataMemory usage is ok.");
            }
            else if (usedPct >= DATAMEMORY_WARNING && 
                     usedPct < DATAMEMORY_CRITICAL)
            {
                advice.setSeverity(Warning);
                advice.setAdvice("DataMemory usage is growing. Consider"
                                 " increasing DataMemory or clear history"
                                 " tables to free up DataMemory.");
            }
            else
            {
                advice.setSeverity(Critical);
                advice.setAdvice("DataMemory usage is at a critical level."
                                 " Node recovery may be compromised when"
                                 " DataMemory usage reaches 95%."
                                 " Consider increasing DataMemory or clear"
                                 " history tables to free up DataMemory.");
            }
            advisorMap[i]= advice;

        }
        break;
    }
    
    return advisorMap;
}

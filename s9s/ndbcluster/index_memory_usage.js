#include "common/mysql_helper.js"
#include "cmon/alarms.h"

var DESCRIPTION="This advisor calculates the ratio of IndexMemory usage over IndexMemory total"
                " so you can increase or clear the history tables as needed.";
var TITLE = "IndexMemory Usage";

var INDEXMEMORY_WARNING = 80;
var INDEXMEMORY_CRITICAL = 90;

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
                                 " memory_type='Index memory'");
        if (result == false)
        {
            advice.setJustification("Failed to read IndexMemory from ndbconfig.");
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
                      "% IndexMemory is used"; 
            advice.setJustification(msg);
            if (usedPct < INDEXMEMORY_WARNING)
            {
             
                advice.setSeverity(Ok);
                advice.setAdvice("IndexMemory usage is ok.");
            }
            else if (usedPct >= INDEXMEMORY_WARNING && 
                     usedPct < INDEXMEMORY_CRITICAL)
            {
                advice.setSeverity(Warning);
                advice.setAdvice("IndexMemory usage is growing. Consider"
                                 " increasing IndexMemory or clear history"
                                 " tables to free up IndexMemory.");
            }
            else
            {
                advice.setSeverity(Critical);
                advice.setAdvice("IndexMemory usage is at a critical level."
                                 " Node recovery may be compromised when"
                                 " IndexMemory usage reaches 95%."
                                 " Consider increasing IndexMemory or clear"
                                 " history tables to free up IndexMemory.");
            }
            advisorMap[i]= advice;

        }
        break;
    }
    
    return advisorMap;
}

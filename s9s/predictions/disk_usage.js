#include "cmon/alarms.h"
/*
 * This script should be scheduled to run e.g once a week.
 */

var LOOKBACK_DAYS=7;
var LOOKAHEAD_DAYS=7;

var THRESHOLD_WARNING=95;

var ADVICE_WARNING="Increase free space on database partition.";
var ADVICE_OK="There is enough free space on the partition.";
var TITLE="Disk Space Prediced Used Space";

function main()
{
    var hosts     = cluster::mySqlNodes();

    var lookBack = LOOKBACK_DAYS*24*3600; // 2 days
    var lookAhead = LOOKAHEAD_DAYS*24*3600; // 30 days

    var endTime   = CmonDateTime::currentDateTime();
    var startTime = endTime - lookBack;
    var futureTime = endTime + lookAhead;
    var advisorMap = {};

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        var advice = new CmonAdvice();

        var stats = host.diskInfo();
        var totalSz = stats[0]["total"]/1024/1024/1024;

        var list  = host.diskStats(startTime, endTime);
        var array1 = list.toArray("free");
        var array2 = list.toArray("created");
        var predictedFreeSz = forecast( futureTime.toInt() ,array1, array2);
        predictedFreeSz = predictedFreeSz/1024/1024/1024;
        var currentFreeSz = array1[array1.size()-1]/1024/1024/1024;
        var currentUsedSz = totalSz - currentFreeSz;
        var predictedUsedSz = abs(totalSz - predictedFreeSz);

        var currentUsage = 100*currentUsedSz/totalSz;
        var predictedUsage = 100*predictedUsedSz/totalSz;
        justification = "Disk space is predicted to reach " + predictedUsage + 
            "% on " +  futureTime.toString() + 
            ". Current used is " +  currentUsedSz + 
            "GiB and total size is " +  totalSz + "GiB.";
        
        if (predictedUsage > THRESHOLD_WARNING )
        {
            msg = ADVICE_WARNING;
            advice.setSeverity(Warning);
        }
        else
        {
            msg = ADVICE_OK;
            advice.setSeverity(Ok);
        }

        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advice.setJustification(justification);
        advisorMap[idx]= advice;
    }
    return advisorMap;
}
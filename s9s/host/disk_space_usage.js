#include "common/mysql_helper.js"
#include "cmon/alarms.h"
/**
 * Checks if the disk space used (current and predicted) > 95%
 */

var TITLE="Checking Disk Space Used and Predicted Usage";
var THRESHOLD_WARNING = 95;
var LOOKBACK_DAYS = 5;
var LOOKAHEAD_DAYS = 2;
var MINUTES = 60;
function main()
{
    var hosts     = cluster::hosts();
    var advisorMap = {};

    var lookBack = LOOKBACK_DAYS*24*3600; // lookback days
    var lookAhead = LOOKAHEAD_DAYS*24*3600; // lockahead days

    var endTime   = CmonDateTime::currentDateTime();
    var startTime = endTime - lookBack;
    var futureTime = endTime + lookAhead;
    var examinedHostnames = "";
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        if (!host.connected())
            continue;
        if (examinedHostnames.contains(host.hostName()))
            continue;
        examinedHostnames += host.hostName();
        print("   ");
        print(host.hostName());
        var advice = new CmonAdvice();

        
        print("==========================");
        
        
        var diskInfoList     = host.diskInfo();
        justification = "";
        msg = "";
        for (i=0;i<diskInfoList.size();i++)
        {
            mountpoint = diskInfoList[i]["mountpoint"];
            device = diskInfoList[i]["device"];
            var list     = host.diskStats(startTime, endTime, device);
            var array3   = list.toArray("total");
            var array1   = list.toArray("free");
            var array2   = list.toArray("created");
    
            var expected = forecast(futureTime.toInt(), array1, array2);
            
                // Linear regression might say we are going to have less than zero
            // bytes of free space, and we say zero then.
            expected = expected < 0 ? 0 : expected;
        
            expectedUsed = array3[array3.size()-1] - expected;
            currentUsed = array3[array3.size()-1] - array1[array1.size()-1];
            expectedUsedPct = round(100 * expectedUsed / array3[array3.size()-1], 1);
            currentUsedPct =round(100 * currentUsed / array3[array3.size()-1], 1);
            
            justification += "Mountpoint '" + mountpoint + "' (" + device + ") : Current: " + currentUsedPct.toInt() + "% disk space is used. "
                "Prediction in " + LOOKAHEAD_DAYS + " days: " + expectedUsedPct.toInt() + 
                "% of disk space will be used.<br/>";
                       
            //print(justification);
        
            if (expectedUsedPct > THRESHOLD_WARNING || currentUsedPct > THRESHOLD_WARNING)
            {
                advice.setSeverity(Warning);
                if (expectedUsedPct > THRESHOLD_WARNING)
                    msg += "Mountpoint '" + mountpoint + "' (" + device + ") : is expected to run short on disk space."
                          " If you have recently removed or created large" 
                          " files on the hosts then the prediction"
                          " (using linear estimation) can be inaccurate."
                          " You are recommended to either increase the partition size or"
                          " purge large, unused, files.<br/>";
                if (currentUsedPct > THRESHOLD_WARNING)
                    msg += "Mountpoint '" + mountpoint + "' (" + device + ") is running low on disk space. Currently " + currentUsedPct +
                          " % is used."
                          " Correct as soon as possible.<br/>";
                          
                host.raiseAlarm(HostDiskUsage, Warning, msg);
            }
            else
            {
                advice.setSeverity(Ok);
                msg+= "Mountpoint '" + mountpoint + "' (" + device + ") : has sufficient disk space.<br/>";
                host.clearAlarm(HostDiskUsage);
            }
            if(diskInfoList.size()>1)
            {
                msg+="<br/>";
                justificitation+="<br/>";
            }
        }
        advice.setJustification(justification);
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));

    }
    return advisorMap;
}

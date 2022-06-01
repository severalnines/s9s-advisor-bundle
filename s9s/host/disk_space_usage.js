#include "common/mysql_helper.js"
#include "cmon/alarms.h"

var DESCRIPTION="This advisor performs a disk check every 30 minutes and"
" notifies you if the disk space usage is greater than 95%.";
var TITLE="Checking Disk Space Usage";
var THRESHOLD_WARNING = 90;
var THRESHOLD_CRITICAL = 95;

function main()
{
    var hosts     = cluster::hosts();
    var advisorMap = {};

    var lookBack  = 1*3600; // lookback (one hour)
    var endTime   = CmonDateTime::currentDateTime();
    var startTime = endTime - lookBack;
    var examinedHostnames = "";

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        var msg = "";
        // if any disk has issues we must raise the alarms
        var alarmMsg = "";
        var raiseAlarm = false;

        host        = hosts[idx];
        if (!host.connected())
            continue;
        if (examinedHostnames.contains(host.hostName()))
            continue;
        examinedHostnames += host.hostName();
        // Ignore the Backup Verficiation Server
        if(host.nodeType() == "bvs")
            continue;

        print("   ");
        print(host.hostName());
        var advice = new CmonAdvice();

        print("==========================");

        var diskInfoList     = host.diskInfo();
        alarmMsg = "";
        justification = "";
        msg = "";
        raiseAlarm = false;
    severity = Ok;
        for (i=0;i<diskInfoList.size();i++)
        {
            mountpoint = diskInfoList[i]["mountpoint"];
            device = diskInfoList[i]["device"];
            var list     = host.diskStats(startTime, endTime, device);
            var totalArr   = list.toArray("total");
            var freeArr   = list.toArray("free");

            // Linear regression might say we are going to have less than zero
            // bytes of free space, and we say zero then.

            currentUsed = totalArr[totalArr.size()-1] - freeArr[freeArr.size()-1];
            currentUsedPct =round(100 * currentUsed / totalArr[totalArr.size()-1], 1);

            justification += "Mountpoint '" + mountpoint +
                "' (" + device + "): " + currentUsedPct.toInt() +
                "% disk space is used.<br/>";
            //print(justification);

            if (currentUsedPct > THRESHOLD_WARNING)
            {
                advice.setSeverity(Warning);
        severity = Warning;
                if (currentUsedPct > THRESHOLD_CRITICAL)
        {
                    advice.setSeverity(Critical);
            severity = Critical;
        }
                msg += "Mountpoint '" + mountpoint + "' (" + device + "):"
                " " + currentUsedPct +
                    " % disk space is used."
                " The partition is running low on disk space."
                " Correct as soon as possible.<br/>";

                // we must raise alarm
                alarmMsg += msg;
                raiseAlarm = true;
            }
            else
            {
                advice.setSeverity(Ok);
                msg+= "Mountpoint '" + mountpoint + "' (" + device + "):"
                " " + currentUsedPct.toInt() +
                    " % disk space is used."
                " The partition has sufficient space.";
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

        if (raiseAlarm) {
            host.raiseAlarm(HostDiskUsage, severity, msg);
        } else {
            host.clearAlarm(HostDiskUsage);
        }
    }

    return advisorMap;
}


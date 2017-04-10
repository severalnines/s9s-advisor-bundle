#include "common/mysql_helper.js"
#include "cmon/alarms.h"

var DESCRIPTION="This advisor performs a CPU check every 5 minutes and notifies you"
                " if the average CPU usage for the last hour exceeds 90%, which"
                " enables you to prevent database performance issues caused by high CPU usage.";
var TITLE="Excessive CPU Usage";
var ADVICE_WARNING= "CPU usage has been high.";
var ADVICE_OK="CPU Usage is ok." ;
var THRESHOLD_WARNING = 90;
var MINUTES = 60;
function main()
{
    var hosts     = cluster::hosts();
    var advisorMap = {};
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
        print("==========================");

        var endTime   = CmonDateTime::currentDateTime();
        var startTime = endTime - MINUTES * 60 /*seconds*/;
        var list     = host.cpuStats(startTime, endTime);
        var array3   = list.toArray("user");
        var array1   = list.toArray("sys");
        var array2   = list.toArray("iowait");
        var array4   = list.toArray("steal");

        var usr = average(array3);
        var sys = average(array1);
        var iowait = average(array2);
        var steal = average(array4);

        var total = 100*(usr + sys + iowait + steal);
        total = total.toInt();

        var advice = new CmonAdvice();
        justification = "CPU Usage has averaged at " + total + "% for the last " + MINUTES +" minutes." ;
        if (total > THRESHOLD_WARNING)
        {
            advice.setSeverity(Warning);
            msg = ADVICE_WARNING;
        }
        else
        {
            advice.setSeverity(Ok);
            msg = ADVICE_OK;
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



#include "common/mysql_helper.js"

var DESCRIPTION="This advisor check if the 'system_time_zone' is consistenly set."
" In some cases, it is normal to have different timezones on the servers.";

var TITLE = "System_time_zone alignment check";


function main()
{
    var hosts      = cluster::mySqlNodes();
    var advisorMap = {};
    var utcDiffMap = {};
    var tzHostMap  = {};
    var utcHostMap = {};
    var timeZonesInUse = "";

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        var advice = new CmonAdvice();
        if (!connected)
        {
            print("Not connected");
            continue;
        }

        var system_time_zone = host.sqlSystemVariable("System_time_zone");
        var utc_diff = getSingleValue(host,"SELECT TIMESTAMPDIFF(MINUTE, UTC_TIMESTAMP, NOW())");
        utcDiffMap[utc_diff]++;
        tzHostMap[host] = system_time_zone;
        utcHostMap[host] = utc_diff;
        
        timeZonesInUse += "<br/>" + (host.toString() +
            " uses system_time_zone=" + system_time_zone +
            " (UTC+"+utc_diff+"minutes).");
    }

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        advice.setHost(host);
        advice.setTitle(TITLE);
        if (utcDiffMap.size() == 1)
        {
            advice.setSeverity(Ok);
            msg = "All ok, nothing to do.";
            justification = "The timezone is consistent on all servers.";
            host.clearAlarm(MySqlTimeZoneCheck);
        }
        else
        {
            advice.setSeverity(Warning);
            msg = "The 'system_time_zone' and/or the actual timezone is not"
            " consistently set on all servers."
            " If this is intentional or does not pose a problem, please ignore"
            " this advisor and you may also wish to disable it.";
            justification = "This server is configured with system_time_zone="
            + tzHostMap[host] + " (UTC+"+utcHostMap[host]+"minutes).<br/>"
            "The following timezones are used: " + timeZonesInUse;
            host.raiseAlarm(MySqlTimeZoneCheck, Warning, justification);
        }
        advice.setAdvice(msg);
        advice.setJustification(justification);
        print("   ");
        print(host);
        print("==========================");

        print(advice.toString("%E"));
        advisorMap[idx]= advice;
    }
    return advisorMap;
}

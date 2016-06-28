
#include "common/helpers.js"
#include "cmon/io.h"
#include "cmon/alarms.h"

var WARNING_THRESHOLD=90;
var TITLE="Connections used";
var ADVICE_WARNING="In the past 5 minutes more than 90% of "
    " the available connections have been used."
    " Consider increasing the number of possible connections "
    " in net.maxIncomingConnections.";
var ADVICE_WARNING_SPIKES="In the past 5 minutes we have detected "
    " spikes in the number of connections used."
    " Consider increasing the number of possible connections "
    " in net.maxIncomingConnections.";
var ADVICE_OK="The percentage of used connections is satisfactory." ;



function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var hosts   = cluster::mongoNodes();
    var advisorMap = {};
    var result= [];
    var msg = "";
    var endTime   = CmonDateTime::currentDateTime();
    var startTime = endTime - 10 * 60;

    for (i = 0; i < hosts.size(); i++)
    {
        host        = hosts[i];
        if(hostAndPort != "*" && !hostMatchesFilter(host,hostAndPort))
            continue;
        if(host.hostStatus() != "CmonHostOnline")
            continue;
        var advice = new CmonAdvice();
        stats = host.mongoStats(startTime, endTime);

        arr_connections_current = stats.toArray("connections.current");
        arr_connections_available = stats.toArray("connections.available");

        total_connections = average(arr_connections_current) + average(arr_connections_available);
        
        if ((average(arr_connections_current) / total_connections) * 100 > WARNING_THRESHOLD)
        {
            advice.setSeverity(Warning);
            msg = ADVICE_WARNING;
        }
        if (max(arr_connections_current) > WARNING_THRESHOLD && advice.severity() <= 0)
        {
            advice.setSeverity(Warning);
            msg = ADVICE_WARNING_SPIKES;
        }
        if (advice.severity() <= 0) {
            advice.setSeverity(Ok);
        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advisorMap[i]= advice;
    }
    return advisorMap;
}
 



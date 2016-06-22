
#include "common/helpers.js"
#include "cmon/io.h"
#include "cmon/alarms.h"

var WARNING_THRESHOLD=10;
var TITLE="Connections used";
var ADVICE_WARNING_READS="In the past 5 minutes more than 90% of "
    " the available read tickets have been used."
    " Consider increasing the number of possible tickets "
    " in wiredTigerConcurrentReadTransactions.";
var ADVICE_WARNING_WRITES="In the past 5 minutes more than 90% of "
    " the available write tickets have been used."
    " Consider increasing the number of possible tickets "
    " in wiredTigerConcurrentWriteTransactions.";
var ADVICE_OK="The percentage of used tickets is satisfactory." ;



function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var hosts   = cluster::mongoNodes();
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

        tickets_read_used = stats.toArray("wiredTiger.concurrentTransactions.read.out");
        tickets_write_used = stats.toArray("wiredTiger.concurrentTransactions.wriet.out");
        tickets_read_available = stats.toArray("wiredTiger.concurrentTransactions.read.available");
        tickets_write_available = stats.toArray("wiredTiger.concurrentTransactions.write.available");

        total_read = average(tickets_read_available) + average(tickets_read_used);
        total_write = average(tickets_write_available) + average(tickets_write_used);
        
        if ((average(tickets_read_available) / total_read) * 100 < WARNING_THRESHOLD)
        {
            advice.setSeverity(Warning);
            msg = ADVICE_WARNING_READS;
        }
        if ((average(tickets_write_available) / total_write) * 100 < WARNING_THRESHOLD)
        {
            advice.setSeverity(Warning);
            msg = ADVICE_WARNING_WRITES;
        }
        if (advice.severity() <= 0) {
            advice.setSeverity(Ok);
        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advisorMap[i]= advice;
    }
}
 



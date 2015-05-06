#include "common/mysql_helper.js"

/**
 * Checks the buffer pool hit ratio
 */
var OK_THRESHOLD=999;
var WARNING_THRESHOLD=990;

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        var advice = new CmonAdvice();

        if (!connected)
            continue;
        if (checkPrecond(host))
        {
            var readRequests = 
                readStatusVariable(host, 
                                   "Innodb_buffer_pool_read_requests").toInt();
            var reads = 
                readStatusVariable(host, "Innodb_buffer_pool_reads").toInt();

            if (readRequests == false || reads == false)
            {
                msg = "Not enough data to calculate";
            }
            var hitRatio = 1000 - 100*(reads/readRequests);
            justification = "1000 - 100 * " + reads 
                + "/" + readRequests 
                + "=" + hitRatio;

            if (hitRatio >= OK_THRESHOLD)
                advice.setSeverity(0);
            else if (hitRatio > OK_THRESHOLD && hitRatio < WARNING_THRESHOLD)
                advice.setSeverity(1);
            else
                advice.setSeverity(2);
            advice.setJustification(justification);
            msg = "Innodb buffer pool hit ratio = " + hitRatio;

        }
        else
        {
            msg = "Not enough data to calculate";
            advice.setSeverity(0);
        }
        advice.setHost(host);
        advice.setTitle("innodb bufferpool hitratio");
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
    }
    return advisorMap;
}
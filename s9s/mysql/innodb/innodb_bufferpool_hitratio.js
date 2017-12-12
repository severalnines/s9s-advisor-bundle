#include "common/mysql_helper.js"

var DESCRIPTION="This advisor calculates the ratio of innodb_buffer_pool_reads over innodb_buffer_pool_read_requests and"
" notifies you if the ratio is lower than 999."
" Hit ratio provides insight on how often MySQL pages are retrieved from memory instead of disk.";
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

        print("   ");
        print(host);
        print("==========================");

        if (!connected)
        {
            print("Not connected");
            continue;
        }
        var readRequests =  host.sqlStatusVariable("innodb_buffer_pool_read_requests");
        var reads =  host.sqlStatusVariable("innodb_buffer_pool_reads");

        if (readRequests.isError() ||
            reads.isError())
        {
            msg = "Not enough data to calculate";
            justification = msg;
            advice.setSeverity(0);
        }
        else
        {
            if (checkPrecond(host))
            {
                if (readRequests == false || reads == false)
                {
                    msg = "Not enough data to calculate";
                }
                var hitRatio = 1000 - 100*(reads.toInt()/readRequests.toInt());
                justification = "1000 - 100 * " + reads.toInt()
                    + "/" + readRequests.toInt()
                    + "=" + hitRatio.toInt();

                if (hitRatio >= OK_THRESHOLD)
                {
                    advice.setSeverity(0);
                    msg = "Innodb buffer pool hit ratio = " + hitRatio +
                        ", which is good.";
                }
                else if (hitRatio > OK_THRESHOLD && hitRatio < WARNING_THRESHOLD)
                {
                    msg = "Innodb buffer pool hit ratio = " + hitRatio +
                        ", which is less that " + WARNING_THRESHOLD +".";
                    advice.setSeverity(1);
                }
                else
                {
                    advice.setSeverity(2);
                    msg = "Innodb buffer pool hit ratio = " + hitRatio +
                        ", which is less that " + WARNING_THRESHOLD +".";
                }
            }
            else
            {
                msg = "Not enough data to calculate";
                justification = msg;
                advice.setSeverity(0);
            }
        }
        advice.setHost(host);
        advice.setTitle("innodb bufferpool hitratio");
        advice.setAdvice(msg);
        advice.setJustification(justification);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}



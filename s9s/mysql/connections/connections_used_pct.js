#include "common/mysql_helper.js"

var DESCRIPTION="This advisor calculates the percentage of threads_connected over max_connections,"
                " if the percentage is higher than 90% you will be notified,"
                " preventing your database server from becoming unstable.";
var WARNING_THRESHOLD=90;
var TITLE="Connections currently used";
var ADVICE_WARNING="You are using more than " + WARNING_THRESHOLD +
    "% of the max_connections."
    " Consider regulating load, e.g by using HAProxy. Using up all connections"
    " may render the database server unusable.";
var ADVICE_OK="The percentage of currently used connections is satisfactory." ;

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

        var Threads_connected = host.sqlStatusVariable("Threads_connected");
        var Max_connections   = host.sqlSystemVariable("Max_connections");
        
        if (Threads_connected.isError() || Max_connections.isError())
        {
            justification = "";
            msg = "Not enough data to calculate";
        }
        else
        {
            var used = round(100 * Threads_connected / Max_connections,1);
            
            if (used > WARNING_THRESHOLD)
            {
                advice.setSeverity(1);
                msg = ADVICE_WARNING;
                justification = used + "% of the connections is currently used,"
                " which is > " + WARNING_THRESHOLD + "% of max_connections.";
                
            }
            else
            {
                justification = used + "% of the connections is currently used,"
                " which is < 90% of max_connections.";
                advice.setSeverity(0);
                msg = ADVICE_OK;
            }
        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setJustification(justification);
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}


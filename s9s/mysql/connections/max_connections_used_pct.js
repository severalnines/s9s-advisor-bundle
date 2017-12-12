#include "common/mysql_helper.js"

var DESCRIPTION="This advisor calculates the percentage of max_used_connections over max_connections"
                " to determine the maximum ever used connections, if the percentage is higher than 90%"
                " you will be notified, preventing your database server from becoming unstable.";
var WARNING_THRESHOLD=0;
var TITLE="Connections ever used";
var ADVICE_WARNING="In the lifetime of the server more than"
    " 90% of the max_connections have been used."
    " Consider regulating load, e.g by using HAProxy. Using up all connections"
    " may render the database server unusable.";
var ADVICE_OK="The percentage of used connections is satisfactory." ;

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
        
        var Max_used_connections = host.sqlStatusVariable("Max_used_connections");
        var Max_connections   = host.sqlSystemVariable("Max_connections");
        
        if (Max_used_connections.isError() || Max_connections.isError())
        {
            justification = "";
            msg = "Not enough data to calculate";
        }
        else
        {
            var used = round(100 * Max_used_connections / Max_connections,1);
            if (used > 90)
            {
                advice.setSeverity(1);
                msg = ADVICE_WARNING;
                justification = "During the lifetime, a peak of " 
                    + used + "% connections"
                " have ever been used,"
                " which is > 90% of max_connections.";
            }
            else
            {
                justification = "During the lifetime, a peak of " 
                    + used + "% connections"
                " have ever been used,"
                " which is <= 90% of max_connections.";
                
                advice.setSeverity(0);
                msg = ADVICE_OK;
            }
        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advice.setJustification(justification);
        print(advice.toString("%E"));
        advisorMap[idx]= advice;
    }
    return advisorMap;
}



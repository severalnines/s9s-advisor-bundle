#include "common/mysql_helper.js"

/**
 * Checks the percentage of currently used connections 
 */

var WARNING_THRESHOLD=0;
var TITLE="Connections used";
var ADVICE_WARNING="You are using more than 80% of the max_connections."
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

        if (!connected)
            continue;
        if (checkPrecond(host))
        {
            var Threads_connected = 
                readStatusVariable(host, "Threads_connected").toInt();
            var Max_connections = 
                readVariable(host, "Max_connections").toInt();
    
            if (Threads_connected == false ||
               Max_connections == false)
            {
                msg = "Not enough data to calculate";
            }
            else
            {
                var used = 100 * Threads_connected / Max_connections;
    
                if (used > 80)
                {
                    advice.setSeverity(1);
                    msg = ADVICE_WARNING;
                    justification = used + "% of the connections have been used,"
                        " which is > 90% of max_connections.";
                }
                else
                {
                    justification = used + "% of the connections have been used,"
                        " which is < 90% of max_connections.";
                    advice.setSeverity(0);
                    msg = ADVICE_OK;
                }
                advice.setJustification(justification);
            }
        }
        else
        {
            msg = "Not enough data to calculate";
            advice.setSeverity(0);
        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
    }
    return advisorMap;
}
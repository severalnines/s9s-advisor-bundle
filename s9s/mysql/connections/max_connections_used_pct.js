#include "common/mysql_helper.js"

/**
 * Checks the percentage of max ever used connections 
 * 
 */ 
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

        if (!connected)
            continue;
        if (checkPrecond(host))
        {
            var Max_used_connections = 
                readStatusVariable(host, "Max_used_connections").toInt();
            
            var Max_connections = readVariable(host, "Max_connections").toInt();
    
            if (Max_used_connections == false ||
                Max_connections == false)
            {
                msg = "Not enough data to calculate";
            }
            else
            {
                var used = 100 * Max_used_connections / Max_connections;
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

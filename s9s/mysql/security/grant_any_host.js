#include "common/mysql_helper.js"
#include "cmon/alarms.h"

var DESCRIPTION="This advisor identifies all users that use a wildcard host from the mysql system table,"
                " and let you have more control over which hosts are able to connect to the servers.";
var TITLE="Access from any host ('%')";

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
        print("   ");
        print(host);
        print("==========================");
        count = getSingleValue(host, 
                               "SELECT COUNT(*) FROM mysql.user"
                               " WHERE host='%'").toInt();
        if (count == false)
            advice.setAdvice("Failed read information from ", host);
        else
        {
            if (count > 0)
            {
                advice.setJustification("Found " + count + 
                                        " accounts allowing access"
                                        " from any host ('%').");
                advice.setAdvice("Be more precise which hosts are allowed to"
                                 " connect to the MySQL Server.");
                advice.setSeverity(Warning);
            }
            else
            {
                advice.setJustification("Did not find any account allowing"
                                        " acccess from any host ('%').");
                advice.setAdvice("No advice.");
                advice.setSeverity(Ok);
            }
            advice.setHost(host);
        }
        advice.setTitle(TITLE);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}

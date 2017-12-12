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
        result = getValueMap(host,
                             "SELECT user,host FROM mysql.user"
                             " WHERE host='%'");


        if (result == false || result.size() == 0)
        {
            advice.setJustification("Did not find any account"
                                    " allowed to connect from any host ('%').");
            advice.setAdvice("No advice.");
            advice.setHost(host);
            advice.setSeverity(Ok);
        }
        else
        {
            count = 0;
            accounts ="";
            for (i=0; i<result.size(); ++i)
            {
                user = result[i][0];
                host = result[i][1];
                accounts = accounts + ("'" + user + "'@'" + host + "'");
                if (i< (result.size()-1))
                    accounts += ",";
                count++;
            }
            if (count > 0)
            {
                advice.setJustification("The following accounts allow access"
                                        " from any host:" + accounts + ".");
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

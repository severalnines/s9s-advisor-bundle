#include "common/mysql_helper.js"
#include "cmon/alarms.h"
/**
 * Checks if a user does not have a password.
 */

var TITLE="Check number of accounts without a password";

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
        ret = getSingleValue(host, 
                           "SELECT COUNT(*) FROM mysql.user WHERE password=''");
        if (ret == false)
        {
            advice.setJustification("Did not find any account"
                                    " without password.");
            advice.setAdvice("No advice.");
        }
        else
        {
            count = ret.toInt();
            if (count > 0)
            {
                advice.setJustification("Found " + count + 
                                        " accounts with no password.");
                advice.setAdvice("You have accounts without a password set."
                                 " Run s9s/mysql/programs/security_audit.js.");
                advice.setSeverity(Warning);
            }
            else
            {
                advice.setJustification("Did not find any"
                                        " account without password.");
                advice.setAdvice("No advice.");
                advice.setSeverity(Ok);
            }
            advice.setHost(host);
        }
        advice.setTitle(TITLE);
        advisorMap[idx]= advice;
    }
    return advisorMap;
}

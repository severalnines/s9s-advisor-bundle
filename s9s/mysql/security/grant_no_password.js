#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

var DESCRIPTION="This advisor identifies all users who do not have a password in the mysql system table,"
                " which helps to increase data security.";
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
            
        print("   ");
        print(host);
        print("==========================");
        var q = "SELECT COUNT(*) FROM mysql.user WHERE password=''";
        if (isMySql57Host(host))
            q = "SELECT COUNT(*) FROM mysql.user WHERE authentication_string=''";
            
        ret = getSingleValue(host, 
                           q);
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
                                 " Run s9s/mysql/programs/security_audit.js"
                                 " for more details and then"
                                 " s9s/mysql/programs/mysql_secure_installation.js");
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
        print(advice.toString("%E"));

    }
    return advisorMap;
}

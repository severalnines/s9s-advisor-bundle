#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

var DESCRIPTION="This advisor identifies all users who do not have a password in the mysql system table,"
" which helps to increase data security.";
var TITLE="Check db accounts without a password";

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
        var q = "SELECT user,host FROM mysql.user WHERE password=''";
        if (isMySql57Host(host) || isMySql80Host(host))
            q = "SELECT user,host FROM mysql.user WHERE authentication_string=''";
        if (isMariaDb10xHost(host))
            q = "SELECT user,host FROM mysql.user WHERE (password='' && authentication_string='')";
        
        ret = getValueMap(host,
                          q);

        advice.setHost(host);

        if (ret == false || ret.size() == 0)
        {
            advice.setJustification("Did not find any account"
                                    " without password.");
            advice.setAdvice("No advice.");
            advice.setHost(host);
            advice.setSeverity(Ok);

        }
        else
        {
            count = 0;
            accounts ="";
            for (i=0; i<ret.size(); ++i)
            {
                user = ret[i][0];
                host = ret[i][1];
                accounts = accounts + ("'" + user + "'@'" + host + "'");
                if (i< (ret.size()-1))
                    accounts += ",";
                count++;
            }

            if (count > 0)
            {
                advice.setJustification("The follow accounts does not have a password: " + accounts + ".");
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
        }
        advice.setTitle(TITLE);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));

    }
    return advisorMap;
}

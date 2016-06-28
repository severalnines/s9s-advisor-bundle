#include "common/mysql_helper.js"

/**
 * Checks if /proc/sys/vm/swappiness is set to 1.
 */

var TITLE="Swappiness check";
var ADVICE_WARNING="/proc/sys/vm/swappiness is not set to 1. Set it to 1 to avoid"
    " unnecessary swapping." ;
var ADVICE_OK="/proc/sys/vm/swappiness is set to 1" ;

function main()
{
    var hosts     = cluster::hosts();
    var advisorMap = {};

    var examinedHostnames = "";
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        if (!host.connected())
            continue;
        
        if (examinedHostnames.contains(host.hostName()))
            continue;
        examinedHostnames += host.hostName();
        print("   ");
        print(host.hostName());
        print("==========================");
        map         = host.toMap();
        var advice = new CmonAdvice();

    
            
        retval = host.system("cat /proc/sys/vm/swappiness");
        reply = retval["result"];
        if (!retval["success"])
        {
            var msg = "";
            if (reply.empty())
            {
                msg  = "Empty reply from 'cat /proc/sys/vm/swappiness',"
                       " assuming it is not set.";
                advice.setSeverity(Ok);
                advice.setJustification(msg);
                advice.setAdvice("Nothing to do.");
            }
            else
            {
                msg = "Check why the command failed: " + retval["errorMessage"];
                advice.setSeverity(Warning);
                advice.setJustification("Command failed.");
                advice.setAdvice("Check why the command failed: " + 
                                  retval["errorMessage"]);
            }
            print(host.hostName() + ": " + msg);
        }
        else
        {
            swappiness = reply.toInt();
            if (swappiness == 1)
            {
                advice.setSeverity(Ok);
                advice.setJustification("/proc/sys/vm/swappiness is set to 1.");
                advice.setAdvice(ADVICE_OK);
            }
            else
            {
                advice.setSeverity(Warning);
                advice.setJustification("/proc/sys/vm/swappiness is set to " + 
                                          swappiness);
                advice.setAdvice(ADVICE_WARNING);
            }
            print(host.hostName() + ": " + reply);

        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}

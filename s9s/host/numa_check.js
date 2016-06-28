#include "common/mysql_helper.js"

/**
 * Checks if NUMA is enabled and if enabled it will
 * tell you that best practice is to disable NUMA.
 */

var TITLE="NUMA Check";
var ADVICE_WARNING="NUMA is enabled and it is best practice to disable it."
    " This may require a host reboot." ;
var ADVICE_OK="NUMA is not enabled." ;

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


        host        = hosts[idx];
        map         = host.toMap();
        var advice = new CmonAdvice();
        
        retval = host.system("dmesg | grep -i numa");
        reply = retval["result"];
        if (!retval["success"])
        {
            var msg = "";
            if (reply.empty())
            {
                msg  = "Empty reply from 'dmesg | grep -i numa', assuming it is not set.";
                advice.setSeverity(Ok);
                advice.setJustification(msg);
                advice.setAdvice(ADVICE_OK);
            }
            else
            {
                msg = "Check why the command failed: " + retval["errorMessage"];
                advice.setSeverity(Warning);
                advice.setJustification("Command failed.");
                advice.setAdvice("Check why the command failed: " + retval["errorMessage"]);
            }
            print(host.hostName() + ": " + msg);
        }
        else
        {
            if (reply.contains("No NUMA"))
            {
                advice.setSeverity(Ok);
                advice.setJustification(reply);
                advice.setAdvice(ADVICE_OK);
            }
            else
            {
                advice.setSeverity(Warning);
                advice.setJustification(reply);
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

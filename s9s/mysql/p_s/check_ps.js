#include "common/mysql_helper.js"

/**
 * Suggests to enable Performance Schema if it is not enabled.
 */ 

var WARNING_THRESHOLD=4;

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};

    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
        map         = host.toMap();

        print("   ");
        print(host);
        print("==========================");
        connected     = map["connected"];
        if (!connected)
        {
            print("Is not connected, continuing.");
            continue;
        }
        var value = readVariable(host, "performance_schema");
        if (value == false || value == #N/A)
            continue;
        var msg ="";
        var advice = new CmonAdvice();
        advice.setTitle("Performance Schema");
        advice.setHost(host);
        justification = "";
        if (value.toString() =="" ||
            value.toString() == "0" ||
            value.toString().toUpperCase() == "OFF")
        {
            msg="Performance Schema is disabled";
            advice.setSeverity(Warning);
            justification = "We recommend you enable performance_schema=ON"
                            " in the configuration, Manage -> Configurations.";
            advice.setJustification(justification);
        }
        else
        {
            msg="Performance Schema is enabled";
            advice.setSeverity(Ok);
            justification = "Current setting is performance_schema=" + value;
            advice.setJustification(justification);
        }
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}

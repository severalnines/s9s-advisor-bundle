#include "common/mysql_helper.js"


/**
 * Checks the setting of wsrep_cluster_address that all nodes
 * are present there.
 */
 

function main()
{
    var hosts     = cluster::galeraNodes();
    var advisorMap = {};

    for (idx = 0; idx < hosts.size(); idx++)
    {
        var advice = new CmonAdvice();
        advice.setTitle("Wsrep SST method");
        host        = hosts[idx];
        if (!host.connected())
        {
            continue;
        }
        var advice = new CmonAdvice();
        advice.setTitle("wsrep_cluster_address check");
        advice.setHost(host);
        var config      = host.config();
        var variable = config.variable("wsrep_cluster_address");
        var value = variable[0]["value"];
        value.replace("'","");
        value.replace("gcomm://","");
        var address = value.split(",");
        var found=true;
        for (k = 0; k < hosts.size(); k++)
        {
            if (!address.contains(hosts[k].hostName()))
            {
                found=false;
                advice.setSeverity(1);
                advice.setJustification("wsrep_cluster_address=" + value + 
                                        " does not contain " + 
                                        hosts[k].hostName());
                advice.setAdvice("Add " + hosts[k].hostName() + 
                                 
                                 " to wsrep_cluster_address.");
            }
        }
        if (found)
        {
            advice.setSeverity(0);
            advice.setJustification("wsrep_cluster_address=" + value + 
                                    " contains all galera nodes.");
            advice.setAdvice("No action needed.");
        }
        advisorMap[idx]= advice;
    }
    return advisorMap;
}

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
        var origValue  = value;
        origValue.replace('"',"");
        value.replace("'","");
        value.replace("gcomm://","");
        var address = value.split(",");
        var found=true;
        var missingHosts = "";
        for (k = 0; k < hosts.size(); k++)
        {
            if (!address.contains(hosts[k].hostName()))
            {
                found=false;
                advice.setSeverity(Warning);
                if(k < hosts.size()-1)  
                    missingHosts = missingHosts + hosts[k].hostName() + " ";
                else
                    missingHosts = missingHosts + hosts[k].hostName();
            }
        }
        if (found)
        {
            advice.setSeverity(Ok);
            advice.setJustification("wsrep_cluster_address=" + origValue + 
                                    " contains all galera nodes.");
            advice.setAdvice("No action needed.");
        }
        else
        {
            missingHosts.replace(" ", ",");
            var justification="";
            var msg = "";
            if(origValue == "gcomm://")
            {
                advice.setSeverity(Critical);
                msg = "Set wsrep_cluster_address=gcomm://" + missingHosts;
                justification = "wsrep_cluster_address=gcomm:// ."
                    " This can lead to disasters and data loss.";
            }
            else
            {
                msg = "Add " + missingHosts + 
                      " to wsrep_cluster_address." + 
                      " Set wsrep_cluster_address=" + 
                    origValue + "," +  missingHosts;
                justification = "wsrep_cluster_address=" + origValue + 
                    " does not contain " + missingHosts;
            }
            advice.setJustification(justification);
            advice.setAdvice(msg);   
        }
        print(advice.toString("%E"));
        advisorMap[idx]= advice;
    }
    return advisorMap;
}


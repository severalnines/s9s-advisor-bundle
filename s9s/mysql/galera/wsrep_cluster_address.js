#include "common/mysql_helper.js"


var DESCRIPTION="This advisor reads the value of wsrep_cluster_address inside each database node's configuration file and"
" notifies you if the parameter does not exist, preventing potential catastrophic failure and data loss during service startup.";
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
        value =  host.sqlSystemVariable("WSREP_CLUSTER_ADDRESS");
        if (value.isError())
        {
            msg = "Not enough data to calculate";
            advice.setSeverity(Ok);
            advice.setJustification(msg);
            advice.setAdvice(msg);
            advisorMap[idx]= advice;
            continue;
        }
        var origValue  = value;
        origValue.replace('"',"");
        value.replace("'","");
        value.replace("gcomm://","");
        if (value.contains("?"))
            value = value.split("?")[0];
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


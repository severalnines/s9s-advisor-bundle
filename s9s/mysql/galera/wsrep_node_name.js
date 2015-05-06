#include "common/mysql_helper.js"


/**
 * Checks the setting of wsrep_node_name
 */
 
var WARNING_THRESHOLD=4;


function main()
{
    var hosts     = cluster::galeraNodes();
    var advisorMap = {};

    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
        map         = host.toMap();
        gStatus     = map["galera"]["galerastatus"];
        
        if (gStatus!="Primary")
            continue;
        var value = readVariable(host, "WSREP_NODE_NAME");
        if (value == false)
            continue;
        var msg ="";
        var advice = new CmonAdvice();
        advice.setTitle("wsrep_node_name check");
        advice.setHost(host);
        if (value.toString() =="")
        {
            msg="Set the wsrep_node_name=" + host.hostName() + "."
                " This allows wsrep_sst_donor to be used."
                " This is a recommendation only (not a must)"
                " and can simplify/optimize recovery if using"
                " wsrep_sst_donor in WAN configurations."
                " wsrep_node_name can be set as a global variable,"
                " but also set in my.cnf.";
            advice.setSeverity(Warning);
            advice.setJustification("wsrep_node_name is not set.");
            host.raiseAlarm(MySqlAdvisor, Warning, msg);
        }
        else
        {
            msg="wsrep_node_name is configured, no action needed.";
            advice.setSeverity(Ok);
            advice.setJustification("Current wsrep_node_name=" + value);
            host.clearAlarm(MySqlAdvisor);
        }
        advice.setAdvice(msg);

        advisorMap[idx]= advice;
    }
    return advisorMap;
}

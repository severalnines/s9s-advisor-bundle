
#include "common/mysql_helper.js"


var DESCRIPTION="This advisor reads the value of wsrep_node_name inside each database node's configuration file and"
                " notifies you if the node does not contain the parameter, which is a recommended way to simplify recovery in especially in WAN setup.";
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
        
        print("   ");
        print(host);
        print("==========================");
        
        if (gStatus!="Primary")
        {
            print("Is not Primary, continuing.");
            continue;
        }
        var value = readVariable(host, "WSREP_NODE_NAME");
        if (value == false)
            continue;
        var msg ="";
        var advice = new CmonAdvice();
        advice.setTitle("wsrep_node_name check");
        advice.setHost(host);
        justification = "";
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
            justification = "wsrep_node_name is not set.";
            advice.setJustification(justification);
            host.raiseAlarm(MySqlAdvisor, Warning, msg);
        }
        else
        {
            msg="wsrep_node_name is configured, no action needed.";
            advice.setSeverity(Ok);
            justification = "Current wsrep_node_name=" + value;
            advice.setJustification(justification);
            host.clearAlarm(MySqlAdvisor);
        }
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}

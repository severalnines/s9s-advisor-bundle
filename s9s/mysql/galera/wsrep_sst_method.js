#include "common/mysql_helper.js"


/**
 * Checks the setting of wsrep_slave_threads
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
        var value = readVariable(host, "WSREP_SST_METHOD");
        if (value == false)
            continue;
        var msg ="";
        var advice = new CmonAdvice();
        advice.setTitle("Wsrep SST method");
        advice.setHost(host);
        if (value.toString() !="xtrabackup-v2")
        {
            msg="Use wsrep_sst_method=xtrabackup-v2 if possible.";
            advice.setSeverity(Warning);
            advice.setJustification("Current wsrep_sst_method=" + value);
            host.raiseAlarm(MySqlAdvisor, Warning, msg);
        }
        else
        {
            msg="Using wsrep_sst_method=xtrabackup-v2, so it is good.";
            advice.setSeverity(Ok);
            advice.setJustification("Current wsrep_sst_method=" + value);
            host.clearAlarm(MySqlAdvisor);
        }
        advice.setAdvice(msg);

        advisorMap[idx]= advice;
    }
    return advisorMap;
}
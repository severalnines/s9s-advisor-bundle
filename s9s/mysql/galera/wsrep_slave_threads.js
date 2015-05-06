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
        var value = readVariable(host, "WSREP_SLAVE_THREADS");
        if (value == false)
            continue;
        var msg ="";
        var advice = new CmonAdvice();
        advice.setTitle("Wsrep slave threads check");
        advice.setHost(host);
        if (value < WARNING_THRESHOLD)
        {
            msg="wsrep_slave_threads should be set to 4 or more."
                " 4 is a good start.";
            
            advice.setSeverity(1);
            advice.setJustification("wsrep_slave_threads <" + WARNING_THRESHOLD);
        }
        else
        {
            msg = "wsrep_slave_threads is set to " + value + " and that is ok.";
            
            advice.setSeverity(0);
            advice.setJustification("wsrep_slave_threads is greater"
                                    " than or equal to " + WARNING_THRESHOLD );

        }
        advice.setAdvice(msg);

        advisorMap[idx]= advice;
    }
    return advisorMap;
}
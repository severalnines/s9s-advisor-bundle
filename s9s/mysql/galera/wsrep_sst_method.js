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
        
        print("   ");
        print(host);
        print("==========================");
        
        if (gStatus!="Primary")
        {
            print("Is not Primary, continuing.");
            continue;
        }
        var value = readVariable(host, "WSREP_SST_METHOD");
        if (value == false)
            continue;
        var msg ="";
        var justification = "";
        var advice = new CmonAdvice();
        advice.setTitle("Wsrep SST method");
        advice.setHost(host);
        if (value.toString() !="xtrabackup-v2")
        {
            retval = host.system("test -f /usr/bin/wsrep_sst_xtrabackup-v2");
            reply = retval["success"];
            if (reply)
            {
               msg="Use wsrep_sst_method=xtrabackup-v2 instead.";
               advice.setSeverity(Warning);
            }
            else
            {
               msg="/usr/bin/wsrep_sst_xtrabackup-v2 does not exist,"
                   " so keep the current setting.";
               advice.setSeverity(Ok);      
            }
            justification = "Current wsrep_sst_method=" + value;
            advice.setJustification(justification);
            host.raiseAlarm(MySqlAdvisor, Warning, msg);
        }
        else
        {
            msg="Using wsrep_sst_method=xtrabackup-v2, so it is good.";
            advice.setSeverity(Ok);
            justification = "Current wsrep_sst_method=" + value;
            advice.setJustification(justification);
            host.clearAlarm(MySqlAdvisor);
        }
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}


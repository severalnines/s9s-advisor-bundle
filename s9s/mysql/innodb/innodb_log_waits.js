#include "common/mysql_helper.js"

/**
 * Checks if innodb has had to wait for redo log flushing.
 */
 
var WARNING_THRESHOLD=0;
var TITLE="InnoDb wait for redolog";
var ADVICE_WARNING="Redo log was full, perhaps due to peak write load."
    " If it continues to increase, increase the innodb_log_file_size."
    " It can also mean that the disks are too slow and cannot sustain IO.";
var ADVICE_OK="No contention on REDO log detected." ;

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        var advice = new CmonAdvice();
        var justification = "";
        var msg = "";
        print("   ");
        print(host);
        print("==========================");
        
        if (!connected)
        {
            print("Not connected");
            continue;
        }
        if (checkPrecond(host))
        {
            var Innodb_log_waits = 
                readStatusVariable(host, "Innodb_log_waits").toInt();

            if (Innodb_log_waits == false)
            {
                msg = "Not enough data to calculate";
            }
            justification = "Innodb_log_waits = " + Innodb_log_waits;
            if (Innodb_log_waits > WARNING_THRESHOLD)
            {
                advice.setSeverity(1);
                msg = ADVICE_WARNING;

            }
            else
            {
                advice.setSeverity(0);
                msg = ADVICE_OK;

            }
        }
        else
        {
            msg = "Not enough data to calculate";
            justification = msg;
            advice.setSeverity(0);
        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advice.setJustification(justification);
        advisorMap[idx]= advice;
                   
        print(msg);
        print(justification);
    }
    return advisorMap;
}

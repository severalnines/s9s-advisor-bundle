#include "common/mysql_helper.js"

var DESCRIPTION="This advisor reads the innodb_log_waits value from the runtime status and notifies if the value is more than 0,"
" which indicates a peak write load and possibility of disks are too slow to sustain the IO.";
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
        var Innodb_log_waits = host.sqlStatusVariable("innodb_log_waits");
        if ( Innodb_log_waits.isError())
        {
            msg = "Not enough data to calculate";
            justification = msg;
            advice.setSeverity(0);
        }
        else
        {
            if (checkPrecond(host))
            {
                if (Innodb_log_waits == false)
                {
                    msg = "Not enough data to calculate";
                }
                justification = "Innodb_log_waits = " + Innodb_log_waits.toInt();
                if (Innodb_log_waits.toInt() > WARNING_THRESHOLD)
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
        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advice.setJustification(justification);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}


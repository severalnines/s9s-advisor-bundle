#include "common/mysql_helper.js"
#include "common/helpers.js"


/**
 * Checks if binlog expire_logs_days is set if log_bin enabled.
 */

var WARNING_THRESHOLD=0;
var TITLE="Expire binlogs";
var ADVICE_WARNING="You are using more than 80% of the max_connections."
" Consider regulating load, e.g by using HAProxy. Using up all connections"
" may render the database server unusable.";
var ADVICE_OK="The percentage of currently used connections is satisfactory." ;

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
        print("   ");
        print(host);
        print("==========================");

        if (!connected)
        {
            print("Not connected");
            continue;
        }
        var logbin =
            host.sqlSystemVariable("log_bin");

        var keyName = "expire_logs_days";  
        if (isMySql80Host(host))
        {
            keyName = "binlog_expire_logs_seconds";  
        }
        var expire_logs_days =
            host.sqlSystemVariable(keyName);

        severity = Ok;
        if (logbin.isError() ||
            expire_logs_days.isError())
        {
            msg = "Not enough data to calculate";
            justification = msg;
            advice.setSeverity(0);
        }
        else
        {
            if (logbin == "ON")
            {
                if ( expire_logs_days.toInt() == 0 )
                {
                    msg = "Set expire_logs_days in my,cnf."
                    " Go to Manage -> Configuration -> Change Parameter,"
                    " and set '" + keyName  + "=VALUE' in group mysqld.";
                    justification = "expire_logs_days is not set."
                    " Set it to e.g expire_logs_days=7 to purge logs older than 7"
                    " days. Otherwise binary logs will grow forever.";
                    severity = Warning;
                }
                else
                {
                    msg = "No advice, no action needed. " + keyName +  " is set.";
                    justification = "" +keyName + "=" + expire_logs_days + ". Setting is ok.";
                }
            }
            else
            {
                msg = "No advice, no action needed.";
                justification = "log_bin is not enabled on this server,"
                " so advisor does not apply.";
            }
        }
        advice.setSeverity(severity);
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setJustification(justification);
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}



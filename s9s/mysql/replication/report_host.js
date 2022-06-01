#include "common/mysql_helper.js"

/**
 * Checks if binlog expire_logs_days is set if log_bin enabled.
 */

var WARNING_THRESHOLD=0;
var TITLE="Check 'report_host' setting";
var ADVICE_WARNING="The parameter 'report_host' is not set."
" Failover and reporting may not function as expected.";
var ADVICE_OK="Nothing to do. report_host is set." ;

function main()
{
    var hosts     = cluster::mySqlNodes();
    var clusterType = cluster::type().toString();
    var advisorMap = {};

    if (clusterType != "REPLICATION")
    {
        var advice = new CmonAdvice();
        advice.setSeverity(Ok);
        advice.setTitle(TITLE);
        advice.setJustification("Advisor supports only REPLICATION clusters.");
        advice.setAdvice("Nothing to do.");
        advisorMap[0]= advice;
        return advisorMap;
    }


    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];

        if (!connected)
        {
            continue;
        }
        var advice = new CmonAdvice();
        var report_host =
            host.sqlSystemVariable("report_host");


        severity = Ok;
        if (report_host.isError())
        {
            msg = "Not enough data to calculate";
            justification = msg;
            advice.setSeverity(Ok);
        }
        else
        {
            if (report_host == "")
            {
                msg = "Set 'report_host' in my.cnf."
                " Go to Manage -> Configuration -> Change Parameter,"
                " and set report_host=" + host.hostName() + " in group mysqld.";
                justification = "'report_host' is not set and it may"
                " affect failover funtionality and reporting.";
                severity = Warning;
                host.raiseAlarm(MySqlReplicationConfigProblem, severity,
                                justification );
            }
            else
            {
                msg = "No action needed.";
                justification = "The parameter 'report_host' is"
                " set: report_host=" + report_host +
                    ", so all is good.";
                host.clearAlarm(MySqlReplicationConfigProblem);
            }
        }
        advice.setSeverity(severity);
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setJustification(justification);
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        //print(advice.toString("%E"));
    }
    return advisorMap;
}



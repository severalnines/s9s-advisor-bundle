#include "common/mysql_helper.js"
#include "cmon/graph.h"

var DESCRIPTION="This advisor calculates the InnoDB log growth per hour and"
" compares it with the innodb_log_file_size configured on the host and"
" notifies you if the InnoDB log growth is higher than what is configured, which is important to avoid IO spikes during flushing.";
var TITLE="Innodb_log_file_size check";


var MINUTES = 20;

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
        if (checkPrecond(host))
        {
            var configured_logfile_sz = host.sqlSystemVariable("innodb_log_file_size");
            var configured_logfile_grps = host.sqlSystemVariable("innodb_log_files_in_group");

            if (configured_logfile_sz.isError() || configured_logfile_grps.isError())
            {
                justification = "";
                msg = "Not enough data to calculate";
                advice.setTitle(TITLE);
                advice.setJustification("");
                advice.setAdvice(msg);
                advice.setHost(host);
                advice.setSeverity(Ok);
                advisorMap[idx]= advice;
                continue;
            }

            var endTime   = CmonDateTime::currentDateTime();
            var startTime = endTime - MINUTES * 60 /*seconds*/;
            var stats     = host.sqlStats(startTime, endTime);
            var array     = stats.toArray("created,interval,INNODB_LSN_CURRENT");

            if(array[2,0] === #N/A  || array[2,0] == "")
            {
                /* Not all vendors have INNODB_LSN_CURRENT*/
                advice.setTitle(TITLE);
                advice.setJustification("INNODB_LSN_CURRENT does not exists in"
                                        " this MySQL release.");
                advice.setAdvice("Nothing to do.");
                advice.setHost(host);
                advice.setSeverity(Ok);
                advisorMap[idx]= advice;
                continue;
            }
            var firstLSN = array[2,0].toULongLong();
            var latestLSN = array[2,array.columns()-1].toULongLong();
            var intervalSecs = endTime.toULongLong() - startTime.toULongLong();
            var logGrowthPerHourMB = ceiling((latestLSN - firstLSN) * 3600 / 1024/1024 / intervalSecs / configured_logfile_grps);
            var logConfiguredMB =  configured_logfile_sz/1024/1024;
            if (logGrowthPerHourMB > logConfiguredMB)
            {
                justification = "Innodb is producing " + logGrowthPerHourMB + "MB/hour, and it greater than"
                " the configured innodb log file size " + logConfiguredMB + "MB."
                " You should set innodb_log_file_size to a value greater than " +
                    logGrowthPerHourMB + "MB. To change"
                " it you must stop the MySQL Server and remove the existing ib_logfileX,"
                " and start the server again. Check the MySQL reference manual for max/min values. "
                "https://dev.mysql.com/doc/refman/5.6/en/innodb-parameters.html#sysvar_innodb_log_file_size";
                msg = "You are recommended to increase the innodb_log_file_size to avoid i/o spikes"
                " during flushing.";
                advice.setSeverity(Warning);
            }
            else
            {
                justification = "Innodb_log_file_size is set to " + logConfiguredMB +
                    "MB and is greater than the log produced per hour: " +
                    logGrowthPerHourMB + "MB.";
                msg = "Innodb_log_file_size is sized sufficiently.";

                advice.setSeverity(Ok);
            }
        }
        else
        {
            justification = "Server uptime and load is too low.";
            msg = "Not enough data to calculate";
            advice.setSeverity(0);
        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setJustification(justification);
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}



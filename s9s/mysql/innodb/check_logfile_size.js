#include "common/mysql_helper.js"
#include "cmon/graph.h"

/**
 * Check size of the innodb_log_file_size and it is sized correctly.
 */
 
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
            var configured_logfile_sz = readVariable(host, "innodb_log_file_size").toULongLong();
            var configured_logfile_grps = readVariable(host, "innodb_log_files_in_group").toULongLong();
            
            var endTime   = CmonDateTime::currentDateTime();
            var startTime = endTime - MINUTES * 60 /*seconds*/;
            var stats     = host.sqlStats(startTime, endTime);
            var array     = stats.toArray("created,interval,INNODB_LSN_CURRENT");
        
            var firstLSN = array[2,0].toULongLong();
            var latestLSN = array[2,array.columns()-1].toULongLong();
            
            var logGrowthPerHour = ceiling((latestLSN - firstLSN) * 60 / 1024/1024 / MINUTES);
            var totalConfiguredLogFileSz = configured_logfile_grps * configured_logfile_sz/1024/1024;
            
            if (logGrowthPerHour > totalConfiguredLogFileSz)
            {
                justification = "Innodb is producing " + logGrowthPerHour + "MB/hour, and it greater than"
                                " the configured innodb log file size " + totalConfiguredLogFileSz + "MB."
                                " You should set innodb_log_file_size to a value greater than " + 
                    ceiling(logGrowthPerHour/configured_logfile_grps) + "MB. To change"
                                " it you must stop the MySQL Server and remove the existing ib_logfileX,"
                    " and start the server again.";
                msg = "You are recommended to increase the innodb_log_file_size to avoid i/o spikes"
                    " during flushing.";
                advice.setSeverity(Warning);
            }
            else
            {
                justification = "Innodb_log_file_size is set to " + configured_logfile_sz/1024/1024 +
                                "MB and it greater than the log produced per hour: " + 
                    logGrowthPerHour/configured_logfile_grps + "MB.";
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
        print(msg);
        print(justification);
    }
    return advisorMap;
}

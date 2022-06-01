#include "common/mysql_helper.js"
#include "common/helpers.js"

/**
 * Checks if binary logs are stored outside of datadir
 */

var TITLE="Binlog Storage Location";

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected   = map["connected"];
        datadir     = map["datadir"];

        var advice = new CmonAdvice();
        advice.setHost(host);
        advice.setTitle(TITLE);
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

        if(isMySql55Host(host) || isMariaDb100Host(host))
        {
            advice.setJustification("This advisor is not support on"
                                    " MySQL/MariaDb 5.5 or MariaDb 10.0.");
            advice.setSeverity(Ok);
            advice.setAdvice("No advise.");
            advisorMap[idx]= advice;
        }
        severity = Ok;
        if (logbin.isError())
        {
            msg = "Not enough data to calculate";
            justification = msg;
            advice.setSeverity(0);
        }
        else
        {
            if (logbin == "ON")
            {
                if ( isBinlogInDatadir(host, datadir) )
                {
                    msg = "It is recommended to store binary logs outside of the datadir."
                    " If the system is working as expected then there is no reason to change."
                    " To change you must change 'log_bin', which requires a server restart.";
                    justification = "Binary logs are stored in the datadir."
                    " Binary logs stored in the datadir maybe overwritten and/or deleted.";
                    severity = Warning;
                }
                else
                {
                    msg = "No advice, no action needed.";
                    justification = "Binary logs are not stored in the datadir";
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
        advice.setJustification(justification);
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}

function isBinlogInDatadir( host, datadir)
{
    if(isMySql55Host(host) || isMariaDb100Host(host))
    {
        return false;
    }
    else
    {
        var logbin_basename =
            host.sqlSystemVariable("log_bin_basename").toString();
        if (logbin_basename.isError())
        {
            return false;
        }
        if (logbin_basename.contains(datadir))
        {
            return true;

        }
    }
}

function getBinlogDir( host)
{
    if(isMySql55Host(host) || isMariaDb100Host(host))
    {

    }
    else
    {
        var logbin_basename =
            host.sqlSystemVariable("log_bin_basename").toString();
        if (logbin_basename.isError())
        {
            return false;
        }

        return logbin_basename;
    }
    return "";
}


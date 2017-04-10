#include "common/mysql_helper.js"

var DESCRIPTION="This advisor calculates the percentage of open_tables over tables_open_cache and"
                " adjusts table_open_cache automatically based on the running workload.";
var UPPER_LIMIT=16384;
var INCREMENT = 256;
var DECREMENT =256;


function needsTuning(host)
{
    if (checkPrecond(host))
    {
        var Opened_tables = readStatusVariable(host, "Opened_tables").toInt();
        var Open_tables = readStatusVariable(host, "Open_tables").toInt();
        var table_open_cache = readVariable(host, "table_open_cache").toInt();
        if (Opened_tables == false ||
            Open_tables == false ||
            table_open_cache == false)
        {
            return 0;
        }
        else
        {
            var fill = 100 * Open_tables / table_open_cache;
            return fill;
        }
    }
    return 0;
}

function main()
{
    var hosts     = cluster::galeraNodes();
    var advisorMap = {};

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        var advice = new CmonAdvice();
        advice.setHost(host);
        advice.setTitle("Table_open_cache auto-tuner.");

        if (connected)
        {
            if (needsTuning(host) > 95)
            {
                var table_open_cache = readVariable(host, 
                                                    "table_open_cache").toInt();
                table_open_cache=table_open_cache + INCREMENT;
                if (table_open_cache < UPPER_LIMIT)
                {
                    retval = setGlobalVariable(host,"table_open_cache", 
                                          table_open_cache);
                    if (retval["success"])
                    {
                        print(host.hostName() + ":" + host.port() + 
                              ": Increasing 'table_open_cache' to " + 
                              table_open_cache + ".");
                        var config      = host.config();
                        value = config.setVariable("MYSQLD", 
                                                   "table_open_cache", 
                                                   table_open_cache);

                        advice.setJustification("Table cache usage is >95%,"
                                                " tuning needed.");
                        var retval = config.save();
                        if (!retval["success"])
                        {
                            print(host, ": Failed due to: " + retval["errorMessage"]);
                            advice.setAdvice("Failed due to: " + retval["errorMessage"]);
                        }
                        else
                        {
                            advice.setAdvice("Increased table_open_cache=" + 
                                             value + 
                                             ".");
                        }
                    }
                    else
                    {
                        print(host, ": Failed due to: " + retval["errorMessage"]);
                        advice.setAdvice("Failed due to: " + retval["errorMessage"]);
                    }
                    
                }
            }
            else
            {
                advice.setJustification("Table cache usage is <=95%,"
                                        " no tuning needed.");
                advice.setAdvice("No tuning needed.");
            }
        }
        else
        {
             advice.setAdvice("Instance not connected.");
        }
        advice.setSeverity(0);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}

#include "common/mysql_helper.js"
#include "cmon/alarms.h"

var DESCRIPTION="This advisor calculates the ratio of Qcache_hits over the sum of Qcache_hits and Qcache_inserts and"
                " provides recommendations for you to configure query_cache_size correctly, a benefit for users with read-intensive workloads.";
var TITLE="Query cache hitratio";
var ADVICE_WARNING= "Tuning the query_cache is hard."
    " Try and increase the query_cache_size to be between 64M and 256M."
    " If the size is already within this range and the hitratio,"
    " then the application/database load may not benefit from the query_cache.";

    var ADVICE_OK="Query cache is ok." ;
var THRESHOLD_WARNING = 50;
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
            var Qcache_hits = readStatusVariable(host, "Qcache_hits").toInt();
            var Qcache_inserts = readStatusVariable(host, 
                                                    "Qcache_inserts").toInt();
 

            var query_cache_type = readVariable(host, "query_cache_type");
            if (Qcache_hits == false ||
               Qcache_inserts == false ||
               query_cache_type == 0 || 
               query_cache_type == "OFF")
            {
                msg = "Not enough data to calculate";
                justification = "Not enough data to calculate";
                advice.setSeverity(Ok);
            }
            else
            {
                if ( Qcache_inserts == 0)
                    Qcache_inserts=1;
                var hit = 100 * Qcache_hits / (Qcache_hits + Qcache_inserts);

                if (hit < THRESHOLD_WARNING)
                {
                    justification = "Query cache hit ratio is " + hit + "%.";
                    advice.setSeverity(Warning);
                    msg = ADVICE_WARNING;
                }
                else
                {
                    justification = "Query cache hit ratio is " + hit + "%.";
                    advice.setSeverity(Ok);
                    msg = ADVICE_OK;
                }
            }
            advice.setJustification(justification);
        }
        else
        {
            msg = "Not enough data to calculate";
            advice.setSeverity(Ok);
        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}


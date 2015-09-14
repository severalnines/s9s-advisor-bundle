#include "common/mysql_helper.js"
#include "cmon/alarms.h"
/**
 * Checks the table cache usage
 */

var TITLE="Query Cache Size";
var ADVICE_WARNING= "query_cache_size is recommended to"
                    " be in the range of 64M to 256M.";
var ADVICE_OK="query_cache_size is ok." ;
var ADVICE_DISABLED="query_cache is disabled."
                    " Read-intensive workloads may benefit from Query Cache." ;

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

        if (!connected)
            continue;
        var query_cache_type = readVariable(host, "query_cache_type");

        if (query_cache_type == 0 || query_cache_type=="OFF")
        {
            msg = ADVICE_DISABLED;
            justification = " Query Cache is disabled, query_cache_type = " + 
                            query_cache_type;
            advice.setSeverity(Ok);
        }
        else
        {
            var query_cache_size = readVariable(host, 
                                              "query_cache_size").toULongLong();
            if (query_cache_size > 63*1024*1024 && query_cache_size < 256*1024*1024)
            {
                msg = ADVICE_OK;
                justification = "query_cache_size is satisfactory."
                                 " query_cache_size= " + 
                                 query_cache_size/1024/1024 + "MB.";
                advice.setSeverity(Ok);
            }
            else
            {
                msg = ADVICE_WARNING;
                justification = "query_cache_size is set to query_cache_size= " + 
                                query_cache_size/1024/1024+"MB.";
                advice.setSeverity(Warning);
            }

        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advice.setJustification(justification);
        print(advice.toString("%E"));
        advisorMap[idx]= advice;
    }
    return advisorMap;
}

#include "common/mysql_helper.js"

/**
 * Checks the percentage of dirty innodb pages
 */
 
var WARNING_THRESHOLD=0;
var TITLE="InnoDb percent dirty pages";
var ADVICE_WARNING= "During write heavy load it is normal"
    " this percentage increase."
    " If the percentage of dirty pages stay high for a long time you may"
    " want to increase the Innodb_buffer_pool_size"
    " and/or get faster disks to avoid performance bottlenecks.";

var ADVICE_OK="InnoDb percent dirty pages is ok." ;

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
            var Innodb_buffer_pool_pages_dirty = 
                readStatusVariable(host, 
                                   "Innodb_buffer_pool_pages_dirty").toInt();

            var Innodb_buffer_pool_pages_total = 
                readStatusVariable(host, 
                                   "Innodb_buffer_pool_pages_total").toInt();

            var ratio = 100 * Innodb_buffer_pool_pages_dirty / 
                Innodb_buffer_pool_pages_total;
            
            var Innodb_max_dirty_pages_pct = 
                readVariable(host, 
                             "Innodb_max_dirty_pages_pct").toInt();
            
            if (Innodb_buffer_pool_pages_dirty == false ||
               Innodb_buffer_pool_pages_total == false ||
                Innodb_max_dirty_pages_pct == false)
            {
                msg = "Not enough data to calculate";
            }
            if (ratio >= Innodb_max_dirty_pages_pct)
            {
                advice.setSeverity(1);
                msg = ADVICE_WARNING;
                justification = "Percent dirty pages " + ratio + " >= " + 
                    Innodb_max_dirty_pages_pct;

            }
            else
            {
                advice.setSeverity(0);
                msg = ADVICE_OK;
                justification = "Percent dirty pages " + ratio + " < " + 
                    Innodb_max_dirty_pages_pct;
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
        print(advice.toString("%E"));
    }
    return advisorMap;
}


#include "common/mysql_helper.js"

var DESCRIPTION="This advisor calculates the ratio of innodb_buffer_pool_pages_dirty over innodb_buffer_pool_pages_total and"
" notifies you if the ratio is higher. This informs you when to increase the innodb_buffer_pool_size,"
" if the ratio stays high for a long time.";
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
        var Innodb_buffer_pool_pages_dirty =
            host.sqlStatusVariable("Innodb_buffer_pool_pages_dirty");
        var Innodb_buffer_pool_pages_total =
            host.sqlStatusVariable("Innodb_buffer_pool_pages_total");
        var Innodb_max_dirty_pages_pct =
            host.sqlSystemVariable("Innodb_max_dirty_pages_pct");

        if (Innodb_buffer_pool_pages_dirty.isError() ||
            Innodb_buffer_pool_pages_total.isError() ||
            Innodb_max_dirty_pages_pct.isError())
        {
            msg = "Not enough data to calculate";
            justification = msg;
            advice.setSeverity(0);
        }
        else
        {
            if (checkPrecond(host))
            {

                var ratio = 100 * Innodb_buffer_pool_pages_dirty.toULongLong() /
                    Innodb_buffer_pool_pages_total.toULongLong();


                if (Innodb_buffer_pool_pages_dirty == false ||
                    Innodb_buffer_pool_pages_total == false ||
                    Innodb_max_dirty_pages_pct == false)
                {
                    msg = "Not enough data to calculate";
                }
                if (ratio >= Innodb_max_dirty_pages_pct.toInt())
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

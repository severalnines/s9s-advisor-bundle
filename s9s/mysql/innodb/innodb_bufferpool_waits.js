#include "common/mysql_helper.js"

var DESCRIPTION="This advisor reads the innodb_buffer_pool_wait_free value from the runtime status and"
" notifies you if the value is more than 0, which indicates the innodb_buffer_pool_size is too small,"
" and that it had to wait for checkpointing.";
var WARNING_THRESHOLD=0;
var TITLE="Innodb_buffer_pool";

var ADVICE_WARNING="Innodb_buffer_pool_wait_free > 0 indicates that the "
"Innodb_buffer_pool is too small and InnoDb had to wait for"
" a checkpoint to complete. Increase Innodb_buffer_pool.";

var ADVICE_OK="Innodb has not waited for checkpoint." ;

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

        var Innodb_buffer_pool_wait_free =
            host.sqlStatusVariable("Innodb_buffer_pool_wait_free");


        if (Innodb_buffer_pool_wait_free.isError())
        {
            msg = "Not enough data to calculate";
            justification = msg;
            advice.setSeverity(0);
        }
        else
        {
            if (checkPrecond(host))
            {
                if (Innodb_buffer_pool_wait_free == false)
                {
                    msg = "Not enough data to calculate";
                }
                justification = "Innodb_buffer_pool_wait_free = " +
                    Innodb_buffer_pool_wait_free;

                if (Innodb_buffer_pool_wait_free.toInt() > WARNING_THRESHOLD)
                {
                    advice.setSeverity(1);
                    msg = ADVICE_WARNING;

                }
                else
                {
                    advice.setSeverity(0);
                    msg = ADVICE_OK;

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


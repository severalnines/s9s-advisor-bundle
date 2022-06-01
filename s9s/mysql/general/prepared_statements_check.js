#include "common/mysql_helper.js"

/**
 * Checks the percentage of max ever used connections 
 * 
 */
var WARNING_THRESHOLD=80;
var TITLE="Max_prepared_stmt_count check";
var ADVICE_WARNING="You are using more than " + WARNING_THRESHOLD +
    "% of the Max_prepared_stmt_count."
" Make sure you deallocate prepared statements whenever it is possible. You can also increase Max_prepared_stmt_count value."
" Reaching Max_prepared_stmt_count will result in errors on next prepared statement allocation attempt.";
var ADVICE_OK="The percentage of currently allocated prepared statements is satisfactory." ;

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


        if(!connected)
            continue;

        var Prepared_stmt_count = host.sqlStatusVariable("Prepared_stmt_count");
        var Max_prepared_stmt_count   = host.sqlSystemVariable("Max_prepared_stmt_count");

        if (Prepared_stmt_count.isError() || Max_prepared_stmt_count.isError())
        {
            justification = "";
            msg = "Not enough data to calculate on " + host;
        }
        else
        {
            var used = round(100 * Prepared_stmt_count / Max_prepared_stmt_count,1);

            if (used > WARNING_THRESHOLD)
            {
                advice.setSeverity(1);
                msg = ADVICE_WARNING;
                justification = used + "% of the prepared statements is currently allocated,"
                " which is > " + WARNING_THRESHOLD + "% of Max_prepared_stmt_count.";

            }
            else
            {
                justification = used + "% of the prepared statements is currently used,"
                " which is <= " + WARNING_THRESHOLD + "% of Max_prepared_stmt_count.";
                advice.setSeverity(0);
                msg = ADVICE_OK;
            }
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

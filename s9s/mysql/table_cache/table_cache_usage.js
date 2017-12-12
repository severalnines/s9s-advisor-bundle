#include "common/mysql_helper.js"

/**
 * Checks the table cache usage
 */

var TITLE="Table cache hitratio";
var ADVICE_WARNING= "Increase table_open_cache in"
" steps until this message disappears.";
var ADVICE_OK="Table_open_cache is configured to suit"
" the current load." ;

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

        var Opened_tables = host.sqlStatusVariable("Opened_tables");
        var Open_tables = host.sqlStatusVariable("Open_tables");
        var table_open_cache = host.sqlSystemVariable("table_open_cache");

        if (Opened_tables.isError() ||
            Open_tables.isError() ||
            table_open_cache.isError())
        {
            msg = "Not enough data to calculate";
            justification = msg;
            advice.setSeverity(0);
        }
        else
        {
            if (checkPrecond(host))
            {
                if (Opened_tables == false ||
                    Open_tables == false ||
                    table_open_cache == false)
                {
                    msg = "Not enough data to calculate";
                }
                else
                {
                    var hit = 100 * Open_tables.toULongLong() / Opened_tables.toULongLong();
                    var fill = 100 * Open_tables.toULongLong() / table_open_cache.toULongLong();
                    hit = round(hit,0);
                    fill = round(fill,0);
                    if ( fill < 95 )
                    {
                        advice.setSeverity(0);
                        msg = ADVICE_OK;
                        justification = "Table_open_cache is used to " + fill + "%.";
                    }
                    else if (hit < 85 || fill > 95)
                    {
                        advice.setSeverity(1);
                        msg = ADVICE_WARNING;
                        justification = "table_open_cache hit ratio is " + hit +
                            " < 85, and used " + fill + " > 95" ;

                    }
                    else
                    {
                        justification = "Table_open_cache hit ratio is " +
                            hit + "%.";
                        advice.setSeverity(0);
                        msg = ADVICE_OK;

                    }
                    advice.setJustification(justification);
                }
            }
            else
            {
                msg = "Not enough data to calculate";
                advice.setSeverity(0);
            }
        }
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        print(advice.toString("%E"));
        advisorMap[idx]= advice;
    }
    return advisorMap;
}


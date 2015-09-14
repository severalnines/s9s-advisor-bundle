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
        if (checkPrecond(host))
        {
            var Opened_tables = readStatusVariable(host, "Opened_tables").toInt();
            var Open_tables = readStatusVariable(host, "Open_tables").toInt();
            var table_open_cache = readVariable(host, "table_open_cache").toInt();
            if (Opened_tables == false ||
               Open_tables == false ||
               table_open_cache == false)
            {
                msg = "Not enough data to calculate";
            }
            else
            {
                var hit = 100 * Open_tables / Opened_tables;
                var fill = 100 * Open_tables / table_open_cache;
    
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
                    justification = "table_open_cache hit ratio is " + ratio + 
                                    " < 85, and used " + fill + " > 95" ;
    
                }
                else
                {
                    justification = "Table_open_cache hit ratio is " + 
                                    ratio + "%.";
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
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        print(advice.toString("%E"));
        advisorMap[idx]= advice;
    }
    return advisorMap;
}

#include "common/mysql_helper.js"
#include "common/helpers.js"

var DESCRIPTION="This advisor selects the unused existing indexes from performance_schema"
" to allow you to remove the unused indexes which improves the schema and overall performance.";
var TITLE="Unused indexes";
var ADVICE_WARNING="Unused indexes have been found in your cluster. It is advised to drop them.";
var ADVICE_OK="No unused indexes found.";

var query="SELECT `object_schema` AS `schema`, `object_name` AS `table`, `index_name` AS `index`"
"FROM `performance_schema`.`table_io_waits_summary_by_index_usage` "
"WHERE `index_name` IS NOT NULL "
"AND `count_star` = 0 "
"AND `object_schema` != 'mysql' "
"AND `index_name` != 'PRIMARY'";

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};
    k = 0;
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        var advice = new CmonAdvice();
        advice.setHost(host);
        advice.setTitle(TITLE);
        count = 0;
        if(!connected)
            continue;
        if (!readVariable(host, "performance_schema").toBoolean())
        {
            advice.setSeverity(Ok);
            advice.setAdvice("No advice.");
            advice.setJustification("performance_schema is not enabled.");
            advisorMap[k++]= advice;
            print(host, ": performance_schema is not enabled.");
            continue;
        }
        if (isMySql55Host(host))
        {
            advice.setJustification("´This advisor is not support on MySQL/MariaDb 5.5.");
            advice.setSeverity(Ok);
            advice.setAdvice("No advise.");
            advisorMap[k++]= advice;
            continue;
        }
        result = getValueMap(host, query);
    //    msg = concatenate("Server: ", host, "<br/>");
     //   msg = concatenate(msg, "------------------------<br/>");
        if(result == false)
        {
            advice.setAdvice("No advise");
            advice.setSeverity(Ok);
            advice.setJustification("Failed to read data from server.");
            advisorMap[k++]= advice;
            continue;
        }
        else
        {
            for (i=0; i<result.size(); ++i)
            {
                if(isSystemTable(result[i][0]))
                {
                    continue;
                }
                count++;
                msg = concatenate(msg, "Unused index found on table '",
                                  result[i][0], ".",
                                  result[i][1], "': index '",
                                  result[i][2], "' should be examined if it can"
                                  " be dropped.<br/><br/>");
            }
            advice.setAdvice(ADVICE_WARNING);
            advice.setSeverity(Warning);
        }
        
        if(count == 0)
        {
            advice.setAdvice("No advise");
            advice.setSeverity(Ok);
            advice.setJustification("No unused indexes found.");
        }
        else
        {
            advice.setJustification(msg);
        }

        advisorMap[k++]= advice;
    }
    return advisorMap;
}



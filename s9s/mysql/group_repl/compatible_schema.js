#include "common/mysql_helper.js"

var DESCRIPTION="This advisor checks the table design to ensure it's compatible"
                " with MySQL Group Replication technology and notifies you if any tables require alteration.";
var TITLE="Compatible Schema Check";
var ADVICE_WARNING="The table design is not compatible with Group Replication."
                   " Check usage of constraints.";
var ADVICE_OK="All tables compatible comply with Group Replication rules.";

var query = "SELECT tables.table_schema , tables.table_name , tables.engine"
" FROM information_schema.tables "
" LEFT JOIN ( "
"   SELECT table_schema , table_name "
"   FROM information_schema.statistics "
"   GROUP BY table_schema, table_name, index_name HAVING "
"     SUM( case when non_unique = 0 and nullable != 'YES' then 1 else 0 end ) = count(*) ) puks "
" ON tables.table_schema = puks.table_schema and tables.table_name = puks.table_name "
" WHERE puks.table_name is null "
"   AND tables.table_type = 'BASE TABLE' AND Engine='InnoDB'";

function main()
{
    var hosts     = cluster::groupReplNodes();
    var advisorMap = {};
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        var msg = "";

        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        var advice = new CmonAdvice();
        advice.setHost(host);
        advice.setTitle(TITLE);
        if(!connected)
            continue;
        result = getValueMap(host, query);
        if (result == false)
        {
            msg = concatenate(msg, 
                        "No incompatible table designs for"
                        " group replication was detected.");
            advice.setAdvice(ADVICE_OK);
            advice.setSeverity(Ok);
        }
        else
        {
            var schema = "";
            var tableName = "";
            var engine = "";
            for (i=0; i<result.size(); ++i)
            {
                schema = result[i][0];
                tableName = result[i][1];
                engine = result[i][2];
                msg = concatenate(msg, schema, ".", tableName,
                                 " (", engine , ") is incompatible.<BR/>");
            }
            advice.setAdvice(ADVICE_WARNING);
            advice.setSeverity(Warning);
        }
        
      //  print(msg);;
        advice.setJustification(msg);
        advisorMap[idx]= advice;
    }
    return advisorMap;
}


#include "common/mysql_helper.js"


/**
 * Check if there are tables without Primary Keys
 * This should be executed as an Advisor once per day, or run manually
 * when a schema change has been made.
 */

var query1= "SELECT DISTINCT t.table_schema, t.table_name, t.engine"
       " FROM information_schema.tables AS t"
       " LEFT JOIN information_schema.columns AS c ON "
       " t.table_schema = c.table_schema AND "
       " t.table_name = c.table_name AND c.column_key = 'PRI'"
       " WHERE t.table_schema "
       " NOT IN ('information_schema', 'mysql', 'performance_schema')"
       " AND c.table_name IS NULL AND t.table_type != 'VIEW'";

var query2="SELECT count(table_name)"
       " FROM information_schema.tables"
       " WHERE table_schema "
       "NOT IN ('mysql', 'INFORMATION_SCHEMA','performance_schema', 'ndbinfo')";
       
var MAX_TABLES=1024;
var ANALYZE_ALL_HOSTS = false;

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};
    /* We will only run the query on one galera node
     * so we will create only one advice.
     */

    var advice = new CmonAdvice();
    advice.setTitle("Tables without PRIMARY KEY");

    var foundNoPK = false;
    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected   = map["connected"];
        var msg ="";
        if (!connected)
            continue;

        print("   ");
        print(host);
        print("==========================");
        advice.setHost(host);        
        var tableCount = getSingleValue(host, query2);

        if (tableCount.toInt() > MAX_TABLES)
        {
            advice.setAdvice("Nothing to do.");
            advice.setSeverity(Ok);
            advice.setJustification("Too many tables to analyze"
                                    " using information_schema.");
            print(advice.toString("%E"));
            advisorMap[idx]= advice;
            if (ANALYZE_ALL_HOSTS)
                continue;
            return advisorMap;
        }
        ret = getValueMap(host, query1);
        if(ret == false || ret.size() == 0)
        {
            advice.setAdvice("Nothing to do. All tables have a PRIMARY KEY");
            advice.setSeverity(Ok);
            advice.setJustification("All tables have a PRIMARY KEY");
            advisorMap[idx]= advice;
            print(advice.toString("%E"));
            if (ANALYZE_ALL_HOSTS)
                continue;
            return advisorMap;
        }

        justification = "The tables: '";
        print("<table>");
        print("<tr><td width=20%>Table Name</td>"
              "<td width=20%>Schema</td>"
              "<td width=10%>Engine</td></tr>");

        for(i=0; i<ret.size(); ++i)
        {
            if( ret[i][0] != "")
            {
                print("<tr><td width=20%>" + ret[i][0] + "</td>"
                  "<td width=20%>" + ret[i][1] + "</td>"
                  "<td width=10%>" + ret[i][2] + "</td></tr>");
                foundNoPK = true;
            }
        }
        print("</table><br/>");

        for(i=0; i<ret.size(); ++i)
        {
            if( ret[i][0] != "")
                justification = justification +  " " + ret[i][0]  + "." + ret[i][1];
        }
        if( foundNoPK )
        {
            justification = justification + "' do not have a PRIMARY KEY.";
            advice.setAdvice("Add a PRIMARY KEY.");
            advice.setSeverity(Warning);
            advice.setJustification(justification);
        }
        else
        {
            advice.setAdvice("Nothing to do. All tables have a PRIMARY KEY");
            advice.setSeverity(Ok);
            advice.setJustification("All tables have a PRIMARY KEY");
        }
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
        if (ANALYZE_ALL_HOSTS)
            continue;
        break;
    }
    return advisorMap;
}


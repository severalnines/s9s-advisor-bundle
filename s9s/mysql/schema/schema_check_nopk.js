#include "common/mysql_helper.js"


/**
 * Check if there are tables without Primary Keys
 * This should be executed as an Advisor once per day, or run manually
 * when a schema change has been made.
 */
 
var WARNING_THRESHOLD=4;

query= "SELECT DISTINCT t.table_schema as db, t.table_name as tbl,"
       " t.engine, if (ISNULL(c.constraint_name),1,0) AS nopk,"
       " if (s.index_type = 'FULLTEXT',1,0) as ftidx,"
       " if (s.index_type = 'SPATIAL',1,0) as gisidx,"
       " concat('ALTER TABLE ', t.table_schema, '.', t.table_name, "
       "' ADD COLUMN new_pk_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY;')"
       "  FROM information_schema.tables AS t"
       " LEFT JOIN information_schema.key_column_usage AS c  ON "
       "       (t.table_schema = c.constraint_schema AND"
       "        t.table_name = c.table_name AND c.constraint_name = 'PRIMARY') "
       " LEFT JOIN information_schema.statistics AS s     ON " 
       "       (t.table_schema = s.table_schema AND "
       "        t.table_name = s.table_name AND"
       "        s.index_type IN ('FULLTEXT','SPATIAL')) "
       " WHERE t.table_schema "
       "     NOT IN ('information_schema','performance_schema','mysql') AND" 
       "        t.table_type = 'BASE TABLE'     AND "
       "        (t.engine <> 'InnoDB' OR c.constraint_name IS NULL OR" 
       "         s.index_type IN ('FULLTEXT','SPATIAL'))  "
    "  ORDER BY t.table_schema,t.table_name";

function main()
{
    var hosts     = cluster::mysqlNodes();
    var advisorMap = {};
    /* We will only run the query on one galera node 
     * so we will create only one advice.
     */
     
    var advice = new CmonAdvice();
    advice.setTitle("Tables without PRIMARY KEY");
        
    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected   = map["connected"];
        var msg ="";
        
        if (!connected)
            continue;
        
        advice.setHost(host);
    
        ret = getValueMap(host, query);
        if(ret == false || ret.size() == 0)
        {
            advice.setAdvice("Nothing to do. All tables have a PRIMARY KEY");
            advice.setSeverity(Ok);
            advice.setJustification("All tables have a PRIMARY KEY");
            break;
        }

        justification = "The tables: '";
        print("<table>");
        print("<tr><td width=20%>Table Name</td>"
              "<td width=20%>Schema</td>"
              "<td width=10%>Engine</td>"
              "<td width=40%>Recommendation</td></tr>");

        for(i=0; i<ret.size(); ++i)
        {
            print("<tr><td width=20%>" + ret[i][0] + "</td>"
                  "<td width=20%>" + ret[i][1] + "</td>"
                  "<td width=10%>" + ret[i][2] + "</td>"
                  "<td width=40%>" + ret[i][6] + "</td></tr>");
        }
        print("</table><br/>");
        for(i=0; i<ret.size(); ++i)
        {
            justification = justification +  " " + ret[i][0]  + "." + ret[i][1];
        }
        justification = justification + "' do not have a PRIMARY KEY.";
        advice.setAdvice("Add a PRIMARY KEY.");
        advice.setSeverity(Warning);
        advice.setJustification(justification);
    
        advisorMap[idx]= advice;
        break;
    }
    return advisorMap;
}

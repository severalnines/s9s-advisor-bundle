#include "common/helpers.js"
#include "common/mysql_helper.js"
#include "cmon/io.h"

/**
 * explain query
 * Format:  hostAndPort db  query
 * hostAndPort :  10.10.10.10:3306 
 * db : "mydb"
 * query : "select 1"
 */


function main(hostAndPort, db, q) 
{
    var result= [];

    if (hostAndPort.toString() == "" || hostAndPort == #N/A ||
        hostAndPort.empty())
    {
        result["error_msg"] = "Argument 'hostAndPort' not specified"; 
        print(result["error_msg"]);
        exit(result);
    }
    if (db.toString() == "" || db == #N/A ||
        db.empty())
    {
        result["error_msg"] = "Argument 'db' not specified"; 
        print(result["error_msg"]);
        exit(result);
    }
    
    if (q.toString() == "" || q == #N/A ||
        q.empty())
    {
        result["error_msg"] = "Argument 'query' not specified"; 
        print(result["error_msg"]);
        exit(result);
    }
    var k = 0;
    var hosts = cluster::mySqlNodes();
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
      
        map = host.toMap();
        connected = map["connected"];
        if (connected) {
            host.executeSqlCommand("USE " + db);
            ret = getValueMap(host, "EXPLAIN " + q);
    
            if (ret != false && ret.size() > 0)
            {

                for (i=0; i<ret.size(); ++i)
                {
                    result[k]={};
                    result[k]["reported_by"]=host.toString();
                    result[k]["id"]=ret[i][0];
                    result[k]["select_type"]=ret[i][1];
                    result[k]["table"]=ret[i][2];
                    result[k]["type"]=ret[i][3];
                    result[k]["possible_keys"]=ret[i][4];
                    result[k]["key"]=ret[i][5];
                    result[k]["key_len"]=ret[i][6];
                    result[k]["ref"]=ret[i][7];
                    result[k]["rows"]=ret[i][8];
                    result[k]["extra"]=ret[i][9];

                    k++;

                }
            }
            break;
        }
    }
    exit(result);
}

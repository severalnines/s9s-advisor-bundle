#include "common/mysql_helper.js"

/**
 * get  a map of a config variable how it is set on all nodes.
 */

var VARIABLE="innodb_log_file_size";

function main()
{
    var hosts     = cluster::galeraNodes();
    var result = {} ;


    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        if (connected)
        {
            result[idx]={};
            result[idx]["host"]=host;

            var value = readVariable(host, VARIABLE);
            if (value.toBoolean() == false)
            {
                print(host.hostName() + ":" + host.port() + 
                      ": Variable " + VARIABLE + " not found.");
                result[idx]["variable"]=VARIABLE;
                result[idx]["value"]= value;
        
                continue;   
            }
            result[idx]["variable"]=VARIABLE;
            result[idx]["value"]= value;
            print(host.hostName() + ":" + host.port() + 
                  ": Variable " + VARIABLE + "=" + value);

        }
        else
        {
            print(host.hostName() + ":" + host.port() + 
                  " :  not connected.");
        }
    }
    return result;
}

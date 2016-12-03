#include "common/mysql_helper.js"

/**
 * Sets a config variable (set global + update the my.cnf)
 * 10.10.10.15 mysqld max_connections 512
 */

function main(hostlist, section, key, newValue)
{
    var hosts     = cluster::hosts();
    var result = {};
    
    if (hostlist == #N/A || 
        section == #N/A ||
        key == #N/A ||
        newValue == #N/A)
    {
        result["success"] = false;

        result["errorMessage"] = "Wrong arguments.";
        exit(result);
    }
    
    var changeHostsArray = hostlist.split(",");
    var hostName = "";
    var msg = "";
    var found;
    for (i = 0; i < changeHostsArray.size(); i++)
    {
        found = false;
        msg = "";
        hostAndPort = changeHostsArray[i];
        hostAndPortArr = hostAndPort.split(":");
        hostName = hostAndPortArr[0];
        port = hostAndPortArr[1];
        for (idx = 0; idx < hosts.size(); ++idx)
        {
            host        = hosts[idx];
            if( host.hostName() != hostName && host.port() !=port )
                continue;
            else
            {
                map         = host.toMap();
                connected     = map["connected"];
                found  = true;
                break;
            }
        }    
        if (!found)
            continue;
        
        result[i]={};
        result[i]["result"] = {};
        result[i]["result"]["hostname"] = hostName + ":" + port;
        result[i]["result"]["restartNeeded"] = true; 
     
        // a better test is needed here, since what we really want to check
        // is if the host is reachable from ssh.
        if (!connected)
        {
            result[i]["result"]["success"] = false ;
            result[i]["result"]["errorMessage"] = host.hostName() + ":" + 
                                                          host.port() + 
                                                          " is not reachable." +
                                                          " Skipping this server";
            continue;
        }

        var config      = host.config();
        error  = config.errorMessage();
        
        value = config.setVariable(section, key, newValue);
        config.save();
        
        if (result[i]["result"]["restartNeeded"]  || !connected)
        {
            msg = msg + " The change has been persisted in the config file.<br/>";
            msg = msg + " <b>A restart of the DB node is required for the"
                + " change to take effect</b>.";
    
        }

        result[i]["result"]["errorMessage"] = msg; 
        if(error != "Success.")
        {
            result[i]["result"]["success"] = false;
            result[i]["result"]["errorMessage"] = error; 
        }
        else
            result[i]["result"]["success"] = true;         
    }   
    return result;
}


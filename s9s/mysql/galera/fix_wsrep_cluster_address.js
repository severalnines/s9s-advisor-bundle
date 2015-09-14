#include "common/mysql_helper.js"


/**
 * Sets the wsrep_cluster_address if not set properly
 * to include all nodes
 */
 

function main()
{
    var hosts     = cluster::galeraNodes();

    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
   
        var config      = host.config();
        var variable = config.variable("wsrep_cluster_address");
        var value = variable[0]["value"];
        var origValue  = value;
        origValue.replace('"',"");
        value.replace("'","");
        value.replace("gcomm://","");
        var address = value.split(",");
        var found=true;
        var missingHosts = "";
        var completeAddress = "";
        for (k = 0; k < hosts.size(); k++)
        {
            if(k < hosts.size()-1)  
                completeAddress = completeAddress + hosts[k].hostName() + " ";
            else
                completeAddress = completeAddress + hosts[k].hostName();

            if (!address.contains(hosts[k].hostName()))
            {
                found=false;
                if(k < hosts.size()-1)  
                    missingHosts = missingHosts + hosts[k].hostName() + " ";
                else
                    missingHosts = missingHosts + hosts[k].hostName();
            }
        }
        if (!found)
        {
            completeAddress.replace(" ", ",");
            
            var justification="";
            var msg = "";
            if(origValue == "gcomm://")
            {
                msg = "Setting wsrep_cluster_address=gcomm://" + completeAddress;
                newValue = "gcomm://" + completeAddress;
            }
            else
            {
                newValue = "gcomm://" + completeAddress;
            }
            
            var config      = host.config();
            value = config.setVariable("MYSQLD", 
                                       "wsrep_cluster_address", 
                                        newValue);
            var retval = config.save();
            if (!retval["success"])
            {
                print(host, ": Failed due to: " + retval["errorMessage"]);
            }
            else
            {
                print(host.hostName() + ": Succesfully set: " + newValue);
            }
        }
    }
}



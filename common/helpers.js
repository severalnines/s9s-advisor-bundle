/*
* Generic helper functions, not db specific.
*/

function hostMatchesFilter(host, hostAndPort)
{
    if(hostAndPort === #N/A || 
       hostAndPort.toString() == "" || 
       hostAndPort.toString()=="*" )
       return true;
       
    hostPortArray = hostAndPort.split(,":");
    hostname=hostPortArray[0];
    port=hostPortArray[1];
    if(host.port() == port.toInt() && host.hostName() == hostname.toString())
    {
        return true;
    }
    return false;
}

function executeOnController(command) 
{
    var hosts  = cluster::hosts();
    var retval = {};
    
    for (idx = 0; idx < hosts.size(); idx++) {
        host = hosts[idx];
        hmap = host.toMap();

        if (hmap['nodetype'] == "controller") { 
            retval = host.system(command);
            break;
        }
    }
    return retval;
}

// Compare host version versus version string
function checkHostVersion(host, version) {
    return host.serverVersion().indexOf(version.toString()) === 0;
}

// Check if the host is of mysql type
function isMySqlHost(host) {
    return host.nodeType() === 'mysql';
}

function isMySql57Host(host) {
    return isMySqlHost(host) && checkHostVersion(host, '5.7');
}

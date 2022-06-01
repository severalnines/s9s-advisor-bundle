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
    serverVersion = host.serverVersion();
    if (serverVersion.startsWith(version))
        return true;
    return false;
    //return host.serverVersion().toString().startsWith(version.toString());
}

// Check if the host is of mysql type
function isMySqlHost(host) {
    return host.nodeType() === 'mysql' ||
        host.nodeType() === 'galera';
}

function isMySql57Host(host) {
    return isMySqlHost(host) && checkHostVersion(host, '5.7');
}

function isMySql80Host(host) {
    return isMySqlHost(host) && checkHostVersion(host, '8.0');
}

function isMySql55Host(host) {
    return isMySqlHost(host) && checkHostVersion(host, '5.5');
}

function isMariaDb100Host(host) {
    return isMySqlHost(host) && checkHostVersion(host, '10.0');
}

function isMariaDb101Host(host) {
    return isMySqlHost(host) && checkHostVersion(host, '10.1');
}

function isMariaDb102Host(host) {
    return isMySqlHost(host) && checkHostVersion(host, '10.2');
}

function isMariaDb103Host(host) {
    return isMySqlHost(host) && checkHostVersion(host, '10.3');
}

function isMariaDb104Host(host) {
    return isMySqlHost(host) && checkHostVersion(host, '10.4');
}

function isMariaDb10xHost(host) {
    return isMySqlHost(host) && checkHostVersion(host, '10.');
}


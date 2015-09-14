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


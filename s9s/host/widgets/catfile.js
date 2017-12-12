
var DESCRIPTION = "This script fetches the last N lines of"
" a log file from a host";

function main(hostName, logFile, lines)
{
    if(hostName == #N/A)
        return false;

    if(logFile == #N/A)
        return false;

    if(lines == #N/A)
        lines = 100;

    var hosts     = cluster::hosts();

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        if (host.hostName() != hostName)
            continue;

        cmd = "tail -" + lines + " " + logFile ;
        retval = host.system(cmd);
        exit(retval);
    }
    return false;
}

/*
Ok execution, , check exitStatus/success and prit the 'result'
{
    "cc_timestamp": 1505821661,
    "requestStatus": "ok",
    "results": {
        "exitStatus": {
            "errorMessage": "",
            "result": "...data is here ..",
            "success": true
        },
        "fileName": "/catlog.js",
        "status": "Ended"
    },
    "success": true
}
FAILED exec, check , check exitStatus/success:

{
  "cc_timestamp": 1505821715,
  "requestStatus": "ok",
  "results": {
    "exitStatus": false,
    "fileName": "/catlog.js",
    "status": "Ended"
  },
  "success": true
}

another failed (file did not exists, check exitStatus/success):

{
  "cc_timestamp": 1505821763,
  "requestStatus": "ok",
  "results": {
    "exitStatus": {
      "errorMessage": "Command exited with 0.",
      "success": false
    },
    "fileName": "/catlog.js",
    "status": "Ended"
  },
  "success": true
}

*/

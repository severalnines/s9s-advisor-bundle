#include "common/mysql_helper.js"

var DESCRIPTION="This advisor scans the MySQL data directory and notifies you"
                " if a .sst directory exists. This directory sometimes appears"
                " after a failed SST which wasn't cleaned up properly. If the"
                " direcory exists, a new SST will fail.";
function main()
{
    var hosts     = cluster::galeraNodes();
    var advisorMap = {};

    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
        map         = host.toMap();

        var msg ="";
        var advice = new CmonAdvice();
        advice.setTitle(".SST Directory Checker");
        advice.setHost(host);
        justification = "";

        var datadir = host.dataDir();
        if (datadir == "")
            continue;

        var retval = host.system("find " + datadir + 
                                 " -maxdepth 1 -name '.sst' | wc -l");
        nr_files = retval["result"];
        
        if(nr_files.toInt() == 0) {
            msg = "Nothing to do. No .sst directory found.";
            advice.setSeverity(Ok);
            justification = "Galera host does not have a .sst directory in the"
                            " MySQL data directory.";
        }
        else {
            justification = "Found a .sst direcory in the MySQL data directory (" + datadir +").";
            advice.setSeverity(Warning);
            msg = "The Galera host contains a .sst directory in the"
              " MySQL data directory. <br/>This directory is"
              " created whenever there is a state transfer, but normally is cleaned"
              " up after completion. The existence of this directory means during"
              " the transfer something went wrong and the directory wasn't cleaned"
              " up properly. This will block any new state transfer, as the"
              " transfer will check if this directory already exists and, if it"
              " does, dies.<br/> A simple removal of this directory will solve this.";
        }
        advice.setAdvice(msg);
        advice.setJustification(justification);
        advisorMap[idx]= advice;
    }

    return advisorMap;
}



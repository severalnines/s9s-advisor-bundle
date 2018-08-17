#include "common/mysql_helper.js"


var DESCRIPTION="This advisor reads the value of wsrep_sst_method and and notifies you"
" if wsrep_sst_xtrabackup-v2 is not installed, which is a recommended SST method for all Galera variants.";
var WARNING_THRESHOLD=4;


function main()
{
    var hosts     = cluster::galeraNodes();
    var advisorMap = {};
    var sst_method = "";
    var alarmMessage;
    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
        map         = host.toMap();
        gStatus     = map["galera"]["galerastatus"];

        print("   ");
        print(host);
        print("==========================");

        if (gStatus!="Primary")
        {
            print("Is not Primary, continuing.");
            continue;
        }
        var msg ="";
        var justification = "";
        var advice = new CmonAdvice();
        var raiseAlarm = false;
        advice.setTitle("Wsrep SST method");
        advice.setHost(host);
        var value = host.sqlSystemVariable("WSREP_SST_METHOD").toString();
        if (value.isError() || value == "")
        {
            msg = "Not enough data to calculate";
            advice.setSeverity(Ok);
            advice.setJustification(msg);
            advice.setAdvice(msg);
            advisorMap[idx]= advice;
            continue;
        }

        if (value.toString() !="xtrabackup-v2" &&
            value.toString() !="mariabackup")
        {
            retval = host.system("test -f /usr/bin/wsrep_sst_xtrabackup-v2");
            reply = retval["success"];
            if (reply)
            {
                raiseAlarm = true;
                msg="Use wsrep_sst_method=xtrabackup-v2 or mariabackup"
                " (for newer version of MariaDb) instead.";
                advice.setSeverity(Warning);
            }
            else
            {
                msg="/usr/bin/wsrep_sst_xtrabackup-v2 does not exist,"
                " so keep the current setting.";
                advice.setSeverity(Ok);
            }
            justification = "Current wsrep_sst_method=" + value;
            advice.setJustification(justification);

        }
        else
        {
            if (sst_method == "") {
                sst_method = value;
            }
            if (sst_method != value) {
                raiseAlarm = true;
                msg="The wsrep_sst_method is not the same throughout the cluster "
		    "and this could lead to incompatible state transfers";
                justification = "Current wsrep_sst_method=" + value;
                advice.setJustification(justification);
                advice.setSeverity(Warning); 
            }
            else {
                msg="Using wsrep_sst_method=" + value + ", so it is good.";
                advice.setSeverity(Ok);
                justification = "Current wsrep_sst_method=" + value;
                advice.setJustification(justification);
                host.clearAlarm(MySqlAdvisor);
            }
        }
        if (raiseAlarm)
        {
            alarmMessage = justification + "\n" + msg;
            host.raiseAlarm(MySqlAdvisor, Warning, alarmMessage);
        }
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}





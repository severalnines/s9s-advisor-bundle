#include "common/mysql_helper.js"
//#include "common/helpers.js"


/**
 * Compares [xtrabackup] password with wsrep_sst_auth
 */
 
function readRemoteConfigValue(config, section, variableName)
{
    var variables    = config.variable(variableName.toString());
    for (i = 0; i < variables.size(); ++i)
    {
        value = variables[i]["value"].toString();
        currentSection = variables[i]["section"];
        if (section.toString() == "")
            return value;
        if (currentSection.toUpperCase() == section.toUpperCase())
            return value;
    }
    return "";
}

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};

    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
        map         = host.toMap();
        gStatus     = map["galera"]["galerastatus"];
        
        print("   ");
        print(host);
        print("==========================");
   
        if(host.nodeType() != "galera")
            continue;
        var config = host.config();
        var wsrepSstAuth = readRemoteConfigValue(config, "","wsrep_sst_auth");
        var wsrepXtrabackupPass = readRemoteConfigValue(config, "xtrabackup", "password");
        var wsrepXtrabackupUser = readRemoteConfigValue(config, "xtrabackup", "user");
        var wsrepSstMethod = readRemoteConfigValue(config, "","wsrep_sst_method");
        
    
        if (wsrepXtrabackupUser == "" || 
            wsrepXtrabackupPass == "")
            continue;
        var msg ="";
        var advice = new CmonAdvice();
        advice.setTitle("SST Auth Validator");
        advice.setHost(host);
        justification = "";
        if (wsrepSstMethod.toString() != "xtrabackup" && 
            wsrepSstMethod.toString() != "xtrabackup-v2")
        {
            msg = "Nothing to do.";
            advice.setSeverity(Ok);
            justification = "Current wsrep_sst_method is " + wsrepSstMethod + ".";
            advice.setJustification(justification);
        }
        else
        {
            if (wsrepSstAuth == "" || wsrepSstAuth == #N/A)
            {
                justification="Could not read wsrep_sst_auth or it is not set.";
                advice.setSeverity(Warning);
                msg = "wsrep_sst_auth could not be read or is not set."
                      "Check the configuration file in Manage->Configurations.";
                advice.setJustification(justification); 
                advice.setSeverity(Warning);
            }
            else
            {
                var regex = /"+/g;
                var regex2 = /'+/g;

                tmp = wsrepSstAuth.replace(regex, "");
                tmp = wsrepSstAuth.replace(regex, "");
                tmp = wsrepSstAuth.replace(regex2, "");
                tmp = wsrepSstAuth.replace(regex2, "");

                tmp  = wsrepSstAuth.split(":");
                user = tmp[0];
                password = tmp[1];
                if (user != wsrepXtrabackupUser ||
                    password != wsrepXtrabackupPass)
                {
                    justification="User/password does not match in wsrep_sst_auth"
                        " and in group [xtrabackup]. The user/password "
                        "must be the same for SST to function properly.";
                    advice.setSeverity(Critical);
                    msg = "User/password does not match. "
                      "Check the configuration file in Manage->Configurations.";   
                    advice.setJustification(justification);
                    host.raiseAlarm(MySqlAdvisor, Warning, justification);
                    advice.setSeverity(Critical);

                }
                else
                {
                    msg = "Nothing to do.";
                    justification = "User/password matches in wsrep_sst_auth"
                    " and in group [xtrabackup]";
                    advice.setJustification(justification);
                    host.clearAlarm(MySqlAdvisor);
                    advice.setSeverity(Ok);

                }
            }
        }
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
    }
    return advisorMap;
}


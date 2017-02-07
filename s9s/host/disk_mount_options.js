#include "cmon/alarms.h"
#include "common/mysql_helper.js"
/**
 * Checks if the CPU Usage for the last hour is > 90%
 */

var TITLE="Disk mount options";
var ADVICE_WARNING= "Disk mount options are not optimal.";
var ADVICE_OK="Disk mount is fine." ;
var fstypes = "xfs,zfs,ext4,btrfs".split(",");

function main()
{
    var hosts     = cluster::hosts();
    var advisorMap = {};
    var examinedHostnames = "";
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host = hosts[idx];
        msg = "";
        justification = "";

        if (!host.connected())
            continue;
        if(host.nodeType() == "galera" || host.nodeType() == "mysql") {
            datadir = readVariable(host, "datadir");
        }
        if (host.nodeType() == "mongo") {
            res = host.executeMongoQuery("admin", "{getCmdLineOpts: 1}");
            datadir = res["result"]["parsed"]["storage"]["dbPath"];
        }
        if(datadir != "") {
            var df_retval = host.system("df " + datadir);
            if (df_retval["success"]) {
                mountpoint_data = df_retval["result"].split('\n')[1].split(" ");
                if(startswith(mountpoint_data[0], "/")) {
                    var mount_retval = host.system("mount");
                    mountpoints = mount_retval["result"].split('\n');
                    for (mount_i = 0; mount_i < mountpoints.size(); mount_i++) {
                        mount = mountpoints[mount_i].split(" ");
                        if(mount[0] == mountpoint_data[0]) {
                            mount_opts = mount[mount.size()-1].replace("(", "").replace(")", "").split(",");
                            // Check for noatime and diratime
                            if(match('noatime', mount_opts) === false || match('nodiratime', mount_opts) === false) {
                                justification += "Noatime and/or nodiratime have not been set for the mount point of the data directory ("+ datadir + ").<br/>";
                                msg += "It is advised to mount " + datadir + " with noatime and nodiratime. This will decrease the number of writes any time a database, table or collection will be opened by MySQL or MongoDB.<br/>";
                            }
                            // Check the filesystem type. Preferred this should be xfs/zfs/ext4 or btrfs
                            if(match(mount[4], fstypes) === false) {
                                justification += "Filesystem on data directory ("+ datadir + ") not the reccomended xfs/zfs/ext4/btrfs.<br/>";
                                msg += "Databases perform better on high performance filesystems like xfs, zfs, ext4 and btrfs. It is advised to store your data directory on a drive formatted with one of these filesystems.<br/>";
                            }
                            // Find the real location of the mountpoint. We need this to get the device name
                            real_mount_point = host.system("readlink -f " + mountpoint_data[0])["result"].split("/");
                            device_name = real_mount_point[real_mount_point.size()-1].replace('\n', '').replace('\r','');
                            
                            // Check for the io scheduler
                            scheduler_exec = host.system("cat /sys/block/" + device_name + "/queue/scheduler");
                            scheduler = scheduler_exec["result"].split(" ");
                            if(match("[noop]", scheduler) === false && match("[deadline]", scheduler) == false) {
                                justification += "The IO scheduler of device "+device_name + " is not set to noop or deadline. Current setting of the IO scheduler is: "+scheduler_exec["result"] + ".<br/>";
                                msg += "The standard IO scheduler of Linux (none or cfq) are optimized for (slow) spinning disks. It is advised to use a different IO scheduler, like noop or deadline, if you are using SSD or high performance storage. Read here how to change this: https://www.cyberciti.biz/faq/linux-change-io-scheduler-for-harddisk/<br/>";
                            }
                        }
                    }
                }
            }
        }



        var advice = new CmonAdvice();
        if (msg.length() > 0) {
            advice.setSeverity(Warning);
        }
        else {
            advice.setSeverity(Ok);
            msg = ADVICE_OK;
        }
        advice.setJustification(justification);
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
        
        print(advice.toString("%E"));

    }
    return advisorMap;
}

function match(needle, haystack)
{
    for (idx = 0; idx < haystack.size(); ++idx)
    {
        if(needle == haystack[idx])
            return idx;
    }
    return false;
}


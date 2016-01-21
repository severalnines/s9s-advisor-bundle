#!/bin/bash

dir=$1
dirs="s9s 
common"

if [ -n "$dir" ]; then 
    dirs="$dir"
fi 
for dir in $dirs
do 
    if [ -d $dir ]; then
        tar cfz `basename $dir`.tar.gz $dir
        if [ $? -eq 0 ]; then 
            echo "Created $dir.tar.gz"
            echo "Import the file:"
            echo "    `pwd`/$dir.tar.gz"
            echo "in the UI: Manage -> Developer Studio -> Import"
        else
            echo "Create bundle failed."
            exit 1
        fi
    else
        echo "Directory $dir is not a valid directory"
        exit 1
    fi
done
exit 0


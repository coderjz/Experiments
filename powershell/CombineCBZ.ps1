
$EXPORT_DIR = ".\EXPORT"
$EXPORT_PREFIX = "image"

if ( test-path $EXPORT_DIR ) {
    rmdir -recurse $EXPORT_DIR
}

mkdir $EXPORT_DIR

#Copy all files to export directory
$i = 0
get-childitem -include *.jpg, *.png, *.gif, *.bmp  -recurse | Foreach-Object {
    $ext = $_.extension
    $i++; $j = "{0:000}" -f $i; 
    $k = [Management.Automation.WildcardPattern]::Escape($_);  #This required to escape characters like [ ]  in file name --> http://www.vistax64.com/powershell/13575-square-brackets-file-names-unexpected-results.html
    cp "$k" "$EXPORT_DIR\$EXPORT_PREFIX$j$ext" ; 
}



#Now let's Zip the new file
$fn = [System.IO.Path]::GetFileName($pwd)
&"C:\Program Files\7-Zip\7Z.exe" "a" "-tzip" "WalkingDead$fn.cbz" "$EXPORT_DIR" "-r"

To compute exhibit resources batch download file from HAR

	cat links.har | grep url | tr -s " " | cut -d " " -f 3 | sed "s/^\"//" | sed "s/\",$//" | sed "s/\?.*$//" | sort | uniq | grep -v google.com | grep -v localhost > links.txt

To download link file using wget

	wget -i ../links.txt -x

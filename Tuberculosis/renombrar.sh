i=1
for file in $(ls -v *.png); do
    mv "$file" "$i.png"
    ((i++))
done


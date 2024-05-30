magick 'original/*.jpg' -resize 720x480  image_%02d.jpg
magick 'original/*.jpg' -resize 1440x960  image_2x_%02d.jpg

magick 'original/*.jpg' -resize 720x480  image_%02d.webp
magick 'original/*.jpg' -resize 1440x960  image_2x_%02d.webp


<picture>
    <source src=”image_00.webp srcset=”image_2x_00.webp 2x” type="image/webp">
    <img    src=”image_00.jpg” srcset=”image_2x_00.jpg 2x”  type="image/jpeg">
</picture>

<img src=”image_1x.jpg” srcset=“image_2x.jpg 2x” />

MOUNT SINAI MORNINGSIDE & WEST GI FELLOWSHIP WEBSITE
Updated September 16, 2026

Getting started
1. Extract this ZIP completely.
2. Open index.html in a web browser.

The complete static website is included: editable HTML, CSS and JavaScript,
photographs, SVG maps, a local signature font, and optimized background videos.
No installation, build step, API key, or internet connection is required to
view the extracted site. External links require internet access.

Hosting
Upload index.html, styles.css, app.js, hero-video.js, community-gallery.js,
and the assets folder
together to a static website host. Keep the relative folder structure intact.
Serve MP4 files with the video/mp4 content type and byte-range support.
The separate single-file HTML preview is intended for offline review after
it downloads; use this ZIP's separate assets when hosting the website so the
browser can load or skip the videos independently of the page and photo.
Creating this package does not update a live host.

Heading video
- Nine calm excerpts from West, Morningside, Union Square, and the fellowship
  film, including faculty-supported scoping and an ultrasound monitor view.
- Approximately six seconds per shot, with 0.625-second crossfades.
- A seamless 54-second loop; audio removed entirely. Drone views play at
  80% speed; shorter clinical shots use slower, interpolated motion.
- The opening is one continuous West street view, with no source edit inside
  the excerpt. Includes Morningside near 3:08 and wide West views near 1:40.
- Muted inline playback, a visible pause/play control, and fixed heading text.
- The original Central Park photo remains beneath the video and is displayed
  before playback begins, when JavaScript is unavailable, or if video fails.
- No video is requested with reduced motion, data saving, reported 3G/2G,
  or a reported downlink below 1.5 Mbps.
- Mobile screens and moderate connections receive the smaller 360p video;
  larger screens on faster connections use the 720p version.
- Startup can take up to 12 seconds while the Central Park photograph stays
  visible. An autoplay rejection or failed startup leaves the photo in place.
- Brief buffering holds the last video frame. A genuine playback interruption
  lasting 10 seconds fades to the photograph without discarding the source;
  playback fades back in automatically when it recovers. Download-only stalls
  and changes in estimated bandwidth do not interrupt established playback.
- Fatal errors fade to the photograph before releasing the video. Reduced
  motion and data-saving preferences continue to disable background playback.
- Playback pauses when the heading is off screen or the tab is hidden.

Location photos
All four location cards use selected supplied photographs. The Mount Sinai
Hospital card features the Guggenheim Pavilion entrance and signage. Original
photos are retained, with responsive 3:2 framing and descriptive alt text.

Fellowship photo banner
Fifteen supplied photographs appear directly beneath the Instagram link in
slightly tilted Polaroid frames. Full image proportions are preserved.
All 15 carousel JPGs have EXIF and other source metadata removed and are
no larger than 500,000 bytes each. Replacement images should follow the same limit.
The strip drifts continuously in one direction and loops seamlessly from the
last photograph back to the first. Previous/next controls also wrap around.
Minimal previous/next and pause/play controls support manual browsing.
Touch swipes, horizontal trackpad scrolling, and arrow/Home/End keys work.
Motion pauses on hover, interaction, off-screen, or when the tab is hidden.
Reduced-motion preferences disable automatic movement; visitors can opt in
using the play control. Without JavaScript, the photo strip remains scrollable.

Replacing carousel photos
Use the extracted ZIP package. The photo files are:
  assets/carousel_photo_1.jpg through assets/carousel_photo_15.jpg
Replace any of these JPGs with your own photo, keeping the exact filename.
The carousel adapts to the new image proportions after loading. Update the
corresponding alt description in index.html if the subject changes. A browser
refresh may be needed after replacing cached files. The single-file HTML
preview embeds its photographs; use the ZIP for exchanging image files.

Source notes, video edit information, and font licensing are in documentation/.

Playback regression checks
From this folder, run: node --test tests/hero-video.test.cjs
The checks simulate media events, buffering, fallback, preference changes,
manual pause, and rapid visibility changes. No dependencies are required.

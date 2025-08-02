# Bottomless Brunch Sydney

A lightweight, single-page web directory showcasing bottomless brunch venues across Sydney — with filters for cuisine, price, availability, and more.

This project was built as a public-facing prototype using HTML, TailwindCSS, and vanilla JavaScript. It is designed to be mobile-first and hostable via GitHub Pages.

## Live Site

https://12-dozen-studio.github.io/bottomless-brunch-sydney/

## Features

- Curated list of 100+ brunch venues across Sydney  
- Filter by cuisine, day, and price range  
- Embedded OpenStreetMap on each venue's detail card  
- Optimized for mobile experience  
- No frameworks, no tracking, no dependencies — just HTML/CSS/JS  
- Built for rapid prototyping with community contributions encouraged

## Project Structure

| File/Folder              | Purpose |
|--------------------------|---------|
| `index.html`             | Main landing page with sticky filters and modal support |
| `assets/script.js`       | Core logic for rendering filters, cards, and modals |
| `brunch_venue.json`      | Main dataset with all venue and package details |
| `brunch_venue.schema.json` | JSON schema used to validate and structure the dataset |
| `suburb_groups.json`     | Grouping used for geographic filtering (e.g., Inner West, CBD) |
| `README.md`              | Project documentation

## Data Structure

Each venue includes:
- Name, address, suburb
- Latitude/longitude
- Website and optional Instagram
- Cuisine and images
- One or more brunch packages with:
  - Name, price, duration
  - Days and sessions
  - Optional booking links and images

See `brunch_venue.schema.json` for full specs.

## Maps

Venue maps use OpenStreetMap with Nominatim for geocoding.  
No API key or Google Maps dependency required.

## Images

Images are planned to be locally hosted in `assets/images/`, downloaded from verified public sources such as official websites, Yelp, and Broadsheet.  
An AI agent script is used to scrape and validate direct image URLs for later download and local hosting.

## Roadmap

- Finalize layout updates for the modal detail card using GrapesJS as a prototyping tool
- Implement dynamic image support:
  - Use validated URLs from agent-collected image data
  - Batch download and rename images systematically (e.g., `venuekey_1.jpg`)
  - Host locally in `/assets/images/`
- Improve UI responsiveness:
  - Adjust spacing and alignment across filter bar, filter status, and cuisine rows
  - Maintain consistent padding to prevent card layout shifts when filters are toggled
- Enhance map integration:
  - Switch to OpenStreetMap using Nominatim fetch per address
  - Add Google Maps fallback or “Open in Google Maps” deep link
- Optimize modal display:
  - Reduce modal height to max 500px
  - Group content sections with clear divs for styling flexibility
- Introduce category/tag badges with frosted background and gradient edge
- Add lazy loading for images and map iframes
- Conduct a class/style audit for consistency and maintainability
- Create `ai-image-instructions.md` with clear prompt and expected output schema
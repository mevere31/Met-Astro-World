# Met-Astro-World

An interactive scrollytelling data story that connects objects from the Metropolitan Museum of Art's collection to world history and astrological transits from the period each object was made.

**[View the live project](https://mevere31.github.io/Met-Astro-World/)**

## About

This narrative project follows a sample of 213 objects in the Met Collection designated as “Highlights”. These objects were created in years connected to important historical incidents between 1201 and 2022. These objecrs represent 322 years of cultural production. 


## Data Sources

- **[The Met Museum Open Access]([url](https://metmuseum.github.io/)) / Highlights dataset**: objects from the museum's collection
- **World history dataset**: [World Important Events - Ancient to Modern]([url](https://www.kaggle.com/datasets/saketk511/world-important-events-ancient-to-modern))
- **Astrological transit data**: [Swiss Ephemeris (python library for programmers using astrological software)]([url](https://www.astro.com/swisseph/swephinfo_e.htm)) 

## Built With

- R and Python (data collection, cleaning, and merging)
- JavaScript, HTML, and CSS (the interactive site)
- GitHub Pages (hosting)
- Cursor (AI coding agent)

## Repository Structure

- `docs/`: the live interactive website (served via GitHub Pages)
- `data/`: the combined datasets used in the project
- `notebooks/`: R and Python scripts for data collection, cleaning, and building the datasets
- `planning/`: the scrollytelling storyline used to plan the site

## Data Pipeline

1. `01_met_data_cleaning.R`: queries and cleans the Met highlights dataset
2. `02_astro_data_collection.ipynb`: collects astrological transit data
3. `03_combine_datasets.ipynb`: combines the Met, world history, and transit data
4. `04_object_image_cards.ipynb`: creates the image cards shown on hover

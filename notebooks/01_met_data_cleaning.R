#Met Collection Dataset

#initializing libraries
library(dplyr)
library(ggplot2)
library(tidyverse)
library(scales)
library(sf)
library(rnaturalearth) #found information for plotting based off of country names on Stack Overflow: https://stackoverflow.com/questions/62867888/spatial-visualization-using-country-names-r
library(rnaturalearthdata)
library(factoextra)

#Met Data----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
met_data <- read.csv("/Users/mikalaeverett/Downloads/MetObjects.txt")

#filtering for just Met highlight objects and objects created after 1700
met_highlights <- met_data |>
  filter(Is.Highlight == "True",
         Object.Begin.Date >= "1700") |>
  select (Object.Number, Is.Highlight, Object.ID, Gallery.Number, AccessionYear, Object.Name, Title, Artist.Display.Name, Artist.Begin.Date, Object.Begin.Date, City, Country)


#view the data
summary(met_highlights)

#still have some items I don't need so removing rows that don't have complete observations or occur prior to 1700
met_data1 <- met_highlights %>%
  filter(!Object.Begin.Date <= 1700)

summary(met_data1)

#visualizing what when objects were created 
ggplot(data = met_data1, aes(x = Object.Begin.Date)) +
  geom_histogram(bins = 100, fill = "red", color = "lightgray") +
  theme_minimal() +
  labs(title = "Mean Object Creation Date",
       subtitle = "Of Highlight Objects in Met Collection",
       x = "Year of Object Creation",
       y = "Number of Objects")

#visualizing where objects were created
world <- ne_countries(scale = "medium", returnclass = "sf")
met_data.world <- merge(world, met_data1, by.x="admin", by.y="Country") #merge by Country columns to visualize

ggplot(data = met_data.world) +
  geom_sf(aes(fill=Object.ID)) +
  scale_fill_gradient(label=comma) +
  theme_gray()

#Adding Historical Events Data------------------------------------------------------------------------------------------------------------------------------------------------

#now adding world historical data - sourced from Kaggle created by Saket Kumar (last updated in 2024)
world_history <- read.csv("/Users/mikalaeverett/Downloads/World Important Dates.csv")

#filtering for events that happened after 1700
eigteenthcent_data <- world_history|>
  filter(Year >= "1700")

#joining to met collection data on country columns
met_history <- merge(eigteenthcent_data, met_data1, by.x="Country", by.y="Country")

summary(met_history)

#selecting columns I'd like to keep
met_world <- met_history |>
  select(Country, Name.of.Incident, Date, Month, Year, Type.of.Event, Place.Name, Impact, Affected.Population, Important.Person.Group.Responsible,
         Object.ID, Gallery.Number, AccessionYear, Object.Name, Title, Artist.Display.Name, Artist.Begin.Date, Object.Begin.Date, City)

summary(met_world)

#changing date columns to numeric values
met_world$Year <- as.numeric(met_world$Year)
met_world$Artist.Begin.Date <- as.numeric(met_world$Artist.Begin.Date)
met_world$Date <- as.numeric(met_world$Date)
met_world$AccessionYear <- as.numeric(met_world$AccessionYear)
summary(met_world)

##visualizing data -----------------------------------------------------------------------------
ggplot(data = met_world, aes(x = Name.of.Incident, y = Object.Begin.Date )) +
  geom_point(color = "blue", alpha = .5, na.rm = TRUE) + 
  theme_minimal() +
  labs(title = "World History Events vs. Creation of A Met Work of Art",
       subtitle = "Globally",
       y = "Year Object Was Created",
       x = "World Incident")

ggplot(data = met_world, aes(x = Type.of.Event)) +
  geom_bar(bins = 100, fill = "blue", color = "lightgray") +
  theme_minimal() +
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1)) +
  labs(title = "Mean of Types of Historical Incidents",
       subtitle = "Of Global Incidents",
       x = "Type of Incident",
       y = "Number of Incidents")

ggplot(data = met_world, aes(x = Year, y = Object.Begin.Date)) +
  geom_point(color = "darkgreen", alpha = .5, na.rm = TRUE) + 
  theme_minimal() +
  labs(title = "Year of Historical Incident vs. Creation of A Met Work of Art",
       subtitle = "Globally",
       y = "Year Object Was Created",
       x = "Year of Historical Event")

ggplot(data = met_world, aes(x = Artist.Begin.Date, y = Year)) +
  geom_point(color = "darkblue", alpha = .5, na.rm = TRUE) + 
  theme_minimal() +
  labs(title = "Year of Historical Incident vs. Artist Begin Date",
       subtitle = "Globally",
       y = "Year of Historical Event",
       x = "Year Artist Begin Date")

ggplot(data = met_world, aes(x = Name.of.Incident, y = Artist.Begin.Date,)) +
  geom_point(color = "darkblue", alpha = .5, na.rm = TRUE) + 
  theme_minimal() +
  labs(title = "Name of Incident vs. Artist Begin Date",
       subtitle = "Globally",
       y = "Year Artist Begin Date",
       x = "Name of Incident")

#Correlation Tests and Cluster Analysis-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
cor.test(met_world$Year, met_world$Object.Begin.Date, method = "pearson") #correlation between Year of Incidents and Object Creation Date
cor.test(met_world$Year, met_world$Artist.Begin.Date, method = "pearson") #correlation between Year of Incident and Artist Begin Date


##running cluster analysis to see if there are any groupings in the data 
## create a matrix
matrix <- dist(x = na.omit(met_world), method = "euclidean")


## explore linkage options
clust.single <- hclust(matrix, method = "single")
clust.average <- hclust(matrix, method = "average")
clust.complete <- hclust(matrix, method = "complete")
clust.ward <- hclust(matrix, method = "ward.D")

## plot dendrograms
plot(clust.single)
plot(clust.average)
plot(clust.complete)
plot(clust.ward)

#saving data for later
write.csv(x = met_world, file = "met_world_history.csv")

##Adding Astrology data
astrodata <- read.csv("/Users/mikalaeverett/Downloads/planetary_transits_1700_present.csv")

summary(astrodata)
#I'm not sure if this is the best dataset yet for my question so I will pick this back up/reconsider how I include this data 

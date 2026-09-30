// The margin code above
const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

let allData = []
let xVar = 'income', yVar = 'lifeExp', sizeVar = 'population', targetYear = 2000
let xScale, yScale, sizeScale

// Create SVG
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    // outter group (used for rectangles/bars)
    .append('g') // empty group g
    .attr('transform', `translate(${margin.left},${margin.top})`); // translate from the top left of margin, to top left of chart area

function init(){
    d3.csv("./data/county_outcomes.csv", 
    // this is the callback function, applied to each item in the array
    // tries to inform imported data into a specific format
    function(d){
        return {  
        // Besides converting the types, we also simpilify the variable names here. 
        country: d.country,
        continent: d.continent,
        year: +d.year, // using + to convert to numbers; same below
        lifeExp: +d.life_expectancy, 
        income: +d.income_per_person, 
        gdp: +d.gdp_per_capita, 
        childDeaths: +d.number_of_child_deaths,
        population: +d.population
     }
    })
    // OR using => technique
    // d3.csv("./data/gapminder_subset.csv", d => ({ 
    //     country: d.country,
    //     // ... same lines as above
    // }))

    .then(data => {
            // console.log(data)
            allData = data
            setupSelector()
            
            // Initial rendering steps:
            // P.S. You could move these into setupSelector(), 
            // but calling them separately makes the flow clearer.
            updateAxes()
            updateVis()
            addLegend()
        })

    .catch(error => console.error('Error loading data:', error));
}

window.addEventListener('load', init);

// Here’s what each function is responsible for:

function setupSelector(){
  // Handles UI changes (sliders, dropdowns)
  // Anytime the user tweaks something, this function reacts.
  // May need to call updateAxes() and updateVis() here when needed!
}

function updateAxes(){
  // Draws the x-axis and y-axis
  // Adds ticks, labels, and makes sure everything lines up nicely
}

function updateVis(){
  // Draws (or updates) the bubbles
}

function addLegend(){
 // Adds a legend so users can decode colors
}
